import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { formatAdmissionRules } from "@/lib/ai/admission-rules";

export const runtime = "nodejs";

const REPORT_VERSION = "v2";
const REPORT_MODEL = process.env.DASHSCOPE_MODEL || "qwen3.8-max";

type PerformanceMetrics = {
  requestStartedAt: string;
  dataFetchMs: number;
  promptBuildMs: number;
  qwenMs: number;
  qwenStartedAt?: string;
  qwenReturnedAt?: string;
  jsonParseMs: number;
};

const reportSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    studentProfile: {
      type: "object",
      additionalProperties: false,
      properties: {
        gpa: { type: "string" },
        majorDirection: { type: "string" },
        languageScore: { type: "string" },
        standardizedTest: { type: "string" }
      },
      required: ["gpa", "majorDirection", "languageScore", "standardizedTest"]
    },
    analysisBasis: {
      type: "object",
      additionalProperties: false,
      properties: {
        factsSummary: { type: "string", maxLength: 120 },
        assessmentSummary: { type: "string", maxLength: 160 },
        advisorAttention: { type: "string", maxLength: 120 }
      },
      required: ["factsSummary", "assessmentSummary", "advisorAttention"]
    },
    competitiveness: {
      type: "object",
      additionalProperties: false,
      properties: {
        hardSkills: { $ref: "#/$defs/dimension" },
        softSkills: { $ref: "#/$defs/dimension" },
        peerComparison: { type: "string" }
      },
      required: ["hardSkills", "softSkills", "peerComparison"]
    },
    risks: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          risk: { type: "string", maxLength: 40 },
          severity: { type: "string", enum: ["高", "中", "低"] },
          reason: { type: "string", maxLength: 140 }
        },
        required: ["risk", "severity", "reason"]
      }
    },
    urgentTasks: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          task: { type: "string", maxLength: 40 },
          priority: { type: "string", enum: ["高", "中", "低"] },
          action: { type: "string", maxLength: 120 }
        },
        required: ["task", "priority", "action"]
      }
    },
    schoolStrategy: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          tier: { type: "string", enum: ["冲刺", "匹配", "稳妥"] },
          rationale: { type: "string", maxLength: 160 },
          examples: { type: "array", maxItems: 4, items: { type: "string" } }
        },
        required: ["tier", "rationale", "examples"]
      }
    },
    timeline90Days: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          period: { type: "string" },
          objective: { type: "string", maxLength: 50 },
          actions: { type: "array", maxItems: 3, items: { type: "string", maxLength: 80 } }
        },
        required: ["period", "objective", "actions"]
      }
    },
    conclusion: { type: "string", maxLength: 260 }
  },
  required: ["title", "studentProfile", "analysisBasis", "competitiveness", "risks", "urgentTasks", "schoolStrategy", "timeline90Days", "conclusion"],
  $defs: {
    dimension: {
      type: "object",
      additionalProperties: false,
      properties: {
        rating: { type: "integer", minimum: 1, maximum: 5 },
        analysis: { type: "string", maxLength: 180 }
      },
      required: ["rating", "analysis"]
    }
  }
} as const;

export async function POST(request: Request) {
  const requestStartedAtMs = performance.now();
  const metrics: PerformanceMetrics = {
    requestStartedAt: new Date().toISOString(),
    dataFetchMs: 0,
    promptBuildMs: 0,
    qwenMs: 0,
    jsonParseMs: 0,
  };
  let studentId = "unknown";
  let cacheStatus: "hit" | "miss" | "bypass" | "unavailable" = "unavailable";
  const finish = <T,>(payload: T, status = 200) => {
    logPerformance(studentId, metrics, performance.now() - requestStartedAtMs, cacheStatus);
    return NextResponse.json(payload, { status });
  };

  if (!process.env.DASHSCOPE_API_KEY) {
    return finish({ error: "服务端尚未配置 DASHSCOPE_API_KEY" }, 500);
  }

  const dataFetchStartedAt = performance.now();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    metrics.dataFetchMs = performance.now() - dataFetchStartedAt;
    return finish({ error: "请求体必须是有效的 JSON" }, 400);
  }

  const student = isRecord(body) && isRecord(body.student) ? body.student : body;
  if (!isRecord(student) || Object.keys(student).length === 0) {
    metrics.dataFetchMs = performance.now() - dataFetchStartedAt;
    return finish({ error: "请提供学生信息 JSON" }, 400);
  }

  const requestedStudentId = isRecord(body) && hasText(body.studentId) ? body.studentId : student.id;
  studentId = hasText(requestedStudentId) ? requestedStudentId : "unknown";
  const forceRegenerate = isRecord(body) && body.forceRegenerate === true;

  const studentJson = JSON.stringify(student);
  metrics.dataFetchMs = performance.now() - dataFetchStartedAt;
  if (studentJson.length > 50_000) {
    return finish({ error: "学生信息过大" }, 413);
  }

  try {
    const cache = createReportCacheClient();
    const canCache = cache && isUuid(studentId);

    if (canCache && !forceRegenerate) {
      const { data: cachedReport, error: cacheReadError } = await cache
        .from("ai_reports")
        .select("id, content, model, version, updated_at")
        .eq("student_id", studentId)
        .eq("version", REPORT_VERSION)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cacheReadError) {
        cacheStatus = "unavailable";
        console.warn("AI report cache lookup failed; continuing with Qwen:", cacheReadError.message);
      } else if (cachedReport && isValidReportShape(cachedReport.content, "cache")) {
        cacheStatus = "hit";
        return finish({
          success: true,
          report: cachedReport.content,
          responseId: `cache-${cachedReport.id}`,
          cached: true,
          model: cachedReport.model,
          version: cachedReport.version,
        });
      } else {
        cacheStatus = "miss";
      }
    } else {
      cacheStatus = forceRegenerate ? "bypass" : "unavailable";
    }

    const openai = new OpenAI({
      apiKey: process.env.DASHSCOPE_API_KEY,
      baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    });
    let completion = await generateCompletion(openai, studentJson, false, metrics);

    let outputText = completion.choices[0]?.message.content;
    logCompletionDiagnostics(completion, outputText, "initial");
    if (!outputText) {
      return finish({ error: "模型未返回报告内容" }, 502);
    }

    let parseStartedAt = performance.now();
    let parsedReport = tryParseModelJson(outputText);
    metrics.jsonParseMs += performance.now() - parseStartedAt;
    if (parsedReport && !isValidReportShape(parsedReport, "initial")) parsedReport = null;
    if (!parsedReport) {
      console.warn("DashScope returned invalid report JSON; retrying once.");
      completion = await generateCompletion(openai, studentJson, true, metrics);
      outputText = completion.choices[0]?.message.content;
      logCompletionDiagnostics(completion, outputText, "retry");
      parseStartedAt = performance.now();
      parsedReport = outputText ? tryParseModelJson(outputText) : null;
      metrics.jsonParseMs += performance.now() - parseStartedAt;
      if (parsedReport && !isValidReportShape(parsedReport, "retry")) parsedReport = null;
    }
    if (!parsedReport) {
      return finish(
        { error: "模型返回的报告格式不完整", details: "已自动重试，请稍后再次生成。" },
        502,
      );
    }

    const report = normalizeMissingProfileData(parsedReport, student);

    if (canCache) {
      const { error: cacheWriteError } = await cache.from("ai_reports").upsert(
        {
          student_id: studentId,
          content: report,
          model: REPORT_MODEL,
          version: REPORT_VERSION,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id" },
      );
      if (cacheWriteError) {
        console.warn("AI report cache write failed; returning generated report:", cacheWriteError.message);
      }
    }

    return finish({
      success: true,
      report,
      responseId: completion.id,
      cached: false,
      model: REPORT_MODEL,
      version: REPORT_VERSION,
    });
  } catch (error) {
    console.error("DashScope report generation failed:", error);
    if (error instanceof OpenAI.APIError) {
      return finish(
        { error: "DashScope API 调用失败", details: error.message },
        error.status || 502,
      );
    }
    const details = error instanceof Error ? error.message : "未知服务端错误";
    console.error("Unexpected report generation error:", details);
    return finish({ error: "生成规划报告时发生错误", details }, 500);
  }
}

async function generateCompletion(
  openai: OpenAI,
  studentJson: string,
  retry: boolean,
  metrics: PerformanceMetrics,
) {
  const promptBuildStartedAt = performance.now();
  const admissionKnowledge = formatAdmissionRules();
  const request: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
    model: REPORT_MODEL,
    messages: [
      {
        role: "system",
        content: [
          "你是一名拥有10年经验的美国本科留学规划顾问，熟悉美国本科整体评估、专业匹配、活动规划与选校策略。",
          "以下 Admission Knowledge Base 是本次分析不可违背的专业背景知识。其约束优先于一般性推断，必须逐项遵守：",
          admissionKnowledge,
          "执行分析时必须先读取学生基础数据，再根据规则库检查数据完整性、歧义和需要顾问确认的事项，最后才能生成规划建议。",
          "analysisBasis 是决策摘要而不是档案清单：factsSummary 用1句话概括申请基础，不逐项复述成绩和经历；assessmentSummary 用1至2句话概括最关键专业判断；advisorAttention 只概括真正影响下一步决策的1至2项信息，无关键待确认项则写“暂无”。",
          "禁止直接根据单个数字得出能力或竞争力结论。TOEFL 5.5 应按2026新版1–6分制理解，不属于歧义或录入异常；应结合CEFR、目标院校要求和申请阶段作专业判断。",
          "请根据学生信息生成中文规划报告。学生画像必须列出 GPA、专业方向、语言成绩和标化成绩；竞争力分析必须分别分析硬实力、软实力，并与同期申请者进行谨慎比较；同时给出当前风险及具体原因、当前最紧急任务、未来90天分阶段规划和目标院校分析。",
          "硬实力应结合 GPA、课程、语言与标化信息；软实力应结合活动和竞赛经历。同期比较只能做定性分析，不能虚构排名、百分位或录取概率。",
          "只能依据输入信息作出判断。任何缺失、空白或无法判断的数据必须输出“暂无”，不得捏造奖项、成绩、经历、院校要求或录取概率。",
          "建议应具体、可执行，并说明这是一份规划建议而非录取保证。",
          "报告保持精炼，总长度控制在1600个中文字符以内。不要在不同模块重复学生已有条件；风险只写会影响申请结果的问题，紧急任务只写未来30天必须行动的事项。",
          "必须只返回符合下方 JSON Schema 的完整 JSON 对象，不要使用 Markdown 代码块或添加解释文字。",
          retry ? "上一次输出无法解析。本次务必检查所有括号、引号和逗号，确保返回完整且合法的 JSON。" : "",
          JSON.stringify(reportSchema),
        ].filter(Boolean).join("\n"),
      },
      {
        role: "user",
        content: `请为以下学生生成美国本科留学规划报告，并以 JSON 格式输出：\n${studentJson}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_completion_tokens: retry ? 10_000 : 6_000,
  };
  metrics.promptBuildMs += performance.now() - promptBuildStartedAt;

  metrics.qwenStartedAt ||= new Date().toISOString();
  const qwenStartedAt = performance.now();
  try {
    return await openai.chat.completions.create(request);
  } finally {
    metrics.qwenMs += performance.now() - qwenStartedAt;
    metrics.qwenReturnedAt = new Date().toISOString();
  }
}

function tryParseModelJson(output: string): Record<string, unknown> | null {
  const cleaned = output.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

  try {
    const parsed = JSON.parse(cleaned) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    // Continue with balanced-object extraction. Some compatible APIs may add
    // harmless text before or after an otherwise valid JSON object.
  }

  for (let start = cleaned.indexOf("{"); start >= 0; start = cleaned.indexOf("{", start + 1)) {
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < cleaned.length; index += 1) {
      const character = cleaned[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === '"') inString = false;
        continue;
      }
      if (character === '"') inString = true;
      else if (character === "{") depth += 1;
      else if (character === "}") {
        depth -= 1;
        if (depth === 0) {
          try {
            const parsed = JSON.parse(cleaned.slice(start, index + 1)) as unknown;
            if (isRecord(parsed)) return parsed;
          } catch {
            break;
          }
        }
      }
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isValidReportShape(value: unknown, source: "cache" | "initial" | "retry") {
  const missing: string[] = [];
  if (!isRecord(value)) {
    console.warn("[AI Report Validation]", { source, missing: ["report"] });
    return false;
  }

  if (!isRecord(value.studentProfile)) missing.push("studentProfile");
  if (!isRecord(value.analysisBasis)) missing.push("analysisBasis");
  if (!isRecord(value.competitiveness)) missing.push("competitiveness");
  if (!Array.isArray(value.risks)) missing.push("risks");
  if (!Array.isArray(value.urgentTasks)) missing.push("urgentTasks");
  if (!Array.isArray(value.timeline90Days)) missing.push("timeline90Days");
  if (!Array.isArray(value.schoolStrategy)) missing.push("schoolStrategy");
  if (typeof value.conclusion !== "string") missing.push("conclusion");

  if (isRecord(value.competitiveness)) {
    if (!isRecord(value.competitiveness.hardSkills)) missing.push("competitiveness.hardSkills");
    if (!isRecord(value.competitiveness.softSkills)) missing.push("competitiveness.softSkills");
    if (typeof value.competitiveness.peerComparison !== "string") missing.push("competitiveness.peerComparison");
  }
  if (Array.isArray(value.timeline90Days) && value.timeline90Days.some((item) => !isRecord(item) || !Array.isArray(item.actions))) {
    missing.push("timeline90Days[].actions");
  }
  if (Array.isArray(value.schoolStrategy) && value.schoolStrategy.some((item) => !isRecord(item) || !Array.isArray(item.examples))) {
    missing.push("schoolStrategy[].examples");
  }

  if (missing.length) {
    console.warn("[AI Report Validation]", { source, missing });
    return false;
  }
  return true;
}

function normalizeMissingProfileData(
  report: Record<string, unknown>,
  student: Record<string, unknown>,
) {
  if (!isRecord(report.studentProfile)) return report;

  const languageTest = isRecord(student.languageTest) ? student.languageTest : {};
  const profile = report.studentProfile;
  if (!hasText(student.gpa)) profile.gpa = "暂无";
  if (!hasText(student.targetMajor)) profile.majorDirection = "暂无";
  if (!hasText(languageTest.type) || !hasText(languageTest.score)) profile.languageScore = "暂无";
  if (!hasText(student.sat)) profile.standardizedTest = "暂无";
  return report;
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function createReportCacheClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function logPerformance(
  studentId: string,
  metrics: PerformanceMetrics,
  totalMs: number,
  cacheStatus: "hit" | "miss" | "bypass" | "unavailable",
) {
  console.log([
    "[AI Report Performance]",
    "",
    `Request Start: ${metrics.requestStartedAt}`,
    "",
    `Student ID: ${studentId}`,
    "",
    `Cache: ${cacheStatus}`,
    "",
    `Data Fetch: ${metrics.dataFetchMs.toFixed(1)} ms`,
    "",
    `Prompt Build: ${metrics.promptBuildMs.toFixed(1)} ms`,
    "",
    `Qwen Start: ${metrics.qwenStartedAt || "not called"}`,
    "",
    `Qwen Return: ${metrics.qwenReturnedAt || "not called"}`,
    "",
    `Qwen API: ${(metrics.qwenMs / 1000).toFixed(2)} s`,
    "",
    `JSON Parse: ${metrics.jsonParseMs.toFixed(1)} ms`,
    "",
    `Total: ${(totalMs / 1000).toFixed(2)} s`,
  ].join("\n"));
}

function logCompletionDiagnostics(
  completion: OpenAI.Chat.Completions.ChatCompletion,
  output: string | null,
  attempt: "initial" | "retry",
) {
  const text = output || "";
  const trimmed = text.trim();
  console.log("[AI Report Debug]", {
    attempt,
    responseId: completion.id,
    finishReason: completion.choices[0]?.finish_reason || "unknown",
    outputCharacters: text.length,
    promptTokens: completion.usage?.prompt_tokens ?? null,
    completionTokens: completion.usage?.completion_tokens ?? null,
    startsWithObject: trimmed.startsWith("{"),
    endsWithObject: trimmed.endsWith("}"),
    balancedBraces: hasBalancedJsonBraces(text),
  });
}

function hasBalancedJsonBraces(value: string) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (const character of value) {
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === "{") depth += 1;
    else if (character === "}") depth -= 1;
    if (depth < 0) return false;
  }
  return depth === 0 && !inString;
}
