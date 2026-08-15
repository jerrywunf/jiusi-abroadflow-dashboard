"use client";

import { useState } from "react";

const testStudent = {
  name: "王子莹",
  grade: "G11",
  targetMajor: "计算机",
  gpa: "3.9/4.0",
};

export default function TestAiPage() {
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function generateReport() {
    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testStudent),
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof data === "object" && data !== null && "error" in data
            ? String(data.error)
            : `请求失败（${response.status}）`;
        throw new Error(message);
      }

      setResult(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "生成报告失败，请稍后重试。",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f9f8] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold text-slate-900">AI 报告接口测试</h1>
          <p className="mt-2 text-sm text-slate-500">
            点击按钮后，将使用预设的模拟学生信息生成规划报告。
          </p>

          <button
            type="button"
            onClick={generateReport}
            disabled={isLoading}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "正在生成…" : "生成测试报告"}
          </button>

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {result !== null && (
            <div className="mt-8">
              <h2 className="mb-3 text-base font-semibold text-slate-900">返回结果</h2>
              <pre className="max-h-[65vh] overflow-auto rounded-xl bg-slate-950 p-5 text-sm leading-6 text-slate-100">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
