"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  defaultTargetSchools, HonorItem, LanguageTestType, SchoolLevel, seedStudents, Student,
  StudentFormValues, StudentHonors, StudentStatus, TargetSchool
} from "@/lib/students";

type DataSource = "supabase" | "fallback";
type MutationResult = Promise<boolean>;

type StudentContextValue = {
  students: Student[];
  hydrated: boolean;
  dataSource: DataSource;
  error: string | null;
  refreshStudents: () => Promise<void>;
  addStudent: (values: StudentFormValues) => MutationResult;
  updateStudent: (id: string, values: Partial<StudentFormValues>) => MutationResult;
  deleteStudent: (id: string) => MutationResult;
  togglePinned: (id: string) => void;
  updateTargetSchools: (id: string, schools: TargetSchool[]) => MutationResult;
  updateHonors: (id: string, honors: StudentHonors) => MutationResult;
};

type StudentRow = {
  id: string;
  name: string | null;
  email: string | null;
  grade: string | null;
  target_country: string | null;
  target_major: string | null;
  gpa: string | null;
  language_type: string | null;
  language_score: string | null;
  counselor: string | null;
  application_status: string | null;
  application_progress: number | null;
  target_schools: unknown;
  honors: unknown;
  created_at: string | null;
};

const StudentContext = createContext<StudentContextValue | null>(null);
const PINNED_STORAGE_KEY = "abroadflow.student-pins.v1";
const colors = ["bg-emerald-100 text-emerald-700", "bg-violet-100 text-violet-700", "bg-amber-100 text-amber-700", "bg-sky-100 text-sky-700", "bg-rose-100 text-rose-700", "bg-cyan-100 text-cyan-700"];

function readPinnedStudents() {
  try {
    return JSON.parse(window.localStorage.getItem(PINNED_STORAGE_KEY) || "{}") as Record<string, boolean>;
  } catch {
    return {};
  }
}

function normalizeSchools(value: unknown): TargetSchool[] {
  if (!Array.isArray(value)) return defaultTargetSchools.map((school) => ({ ...school }));
  return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object").map((item) => ({
    name: typeof item.name === "string" ? item.name : "未命名院校",
    level: (["冲刺", "匹配", "稳妥"].includes(String(item.level)) ? item.level : "匹配") as SchoolLevel,
    logo: typeof item.logo === "string" ? item.logo : ""
  }));
}

function normalizeStatus(value: string | null): StudentStatus {
  return (["规划中", "材料准备", "申请中", "已录取"].includes(value || "") ? value : "规划中") as StudentStatus;
}

function normalizeHonors(value: unknown): StudentHonors {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const normalizeItems = (items: unknown): HonorItem[] => Array.isArray(items) ? items.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object").map((item) => ({ title: typeof item.title === "string" ? item.title : "", year: typeof item.year === "string" ? item.year : "" })).filter((item) => item.title) : [];
  return { activities: normalizeItems(source.activities), competitions: normalizeItems(source.competitions) };
}

function rowToStudent(row: StudentRow, index: number, pinned: Record<string, boolean>): Student {
  return {
    id: row.id,
    name: row.name || "未命名学生",
    email: row.email || "",
    grade: row.grade || "",
    targetCountry: row.target_country || "",
    targetMajor: row.target_major || "",
    intake: "待确认",
    gpa: row.gpa || "",
    languageTest: { type: (["IELTS", "TOEFL", "Duolingo"].includes(row.language_type || "") ? row.language_type : "") as LanguageTestType, score: row.language_score || "" },
    sat: "",
    counselor: row.counselor || "待分配",
    status: normalizeStatus(row.application_status),
    progress: row.application_progress ?? 0,
    isPinned: Boolean(pinned[row.id]),
    targetSchools: normalizeSchools(row.target_schools),
    honors: normalizeHonors(row.honors),
    color: colors[index % colors.length],
    updated: row.created_at ? new Date(row.created_at).toLocaleDateString("zh-CN") : "数据库同步"
  };
}

function formValuesToRow(values: Partial<StudentFormValues>) {
  const row: Record<string, unknown> = {};
  if (values.name !== undefined) row.name = values.name;
  if (values.email !== undefined) row.email = values.email;
  if (values.grade !== undefined) row.grade = values.grade;
  if (values.targetCountry !== undefined) row.target_country = values.targetCountry;
  if (values.targetMajor !== undefined) row.target_major = values.targetMajor;
  if (values.gpa !== undefined) row.gpa = values.gpa;
  if (values.languageTest !== undefined) {
    row.language_type = values.languageTest.type;
    row.language_score = values.languageTest.score;
  }
  return row;
}

export function StudentProvider({ children }: { children: React.ReactNode }) {
  const [students, setStudents] = useState<Student[]>(seedStudents);
  const [hydrated, setHydrated] = useState(false);
  const [dataSource, setDataSource] = useState<DataSource>("fallback");
  const [error, setError] = useState<string | null>(null);

  async function refreshStudents() {
    const { data, error: queryError } = await supabase.from("students").select("*").order("created_at", { ascending: false });
    if (queryError) {
      console.error("Supabase students query failed:", queryError);
      setStudents(seedStudents);
      setDataSource("fallback");
      setError(`Supabase 连接失败：${queryError.message}`);
    } else if (!data?.length) {
      setStudents(seedStudents);
      setDataSource("fallback");
      setError(null);
    } else {
      const pinned = readPinnedStudents();
      setStudents((data as StudentRow[]).map((row, index) => rowToStudent(row, index, pinned)));
      setDataSource("supabase");
      setError(null);
    }
    setHydrated(true);
  }

  useEffect(() => { void refreshStudents(); }, []);

  async function addStudent(values: StudentFormValues) {
    const { error: mutationError } = await supabase.from("students").insert({
      ...formValuesToRow(values),
      counselor: "待分配",
      application_status: "规划中",
      application_progress: 8,
      target_schools: defaultTargetSchools,
      honors: { activities: [], competitions: [] }
    });
    if (mutationError) return handleMutationError("新增学生失败", mutationError.message);
    await refreshStudents();
    return true;
  }

  async function updateStudent(id: string, values: Partial<StudentFormValues>) {
    const { error: mutationError } = await supabase.from("students").update(formValuesToRow(values)).eq("id", id);
    if (mutationError) return handleMutationError("更新学生失败", mutationError.message);
    await refreshStudents();
    return true;
  }

  async function deleteStudent(id: string) {
    const { error: mutationError } = await supabase.from("students").delete().eq("id", id);
    if (mutationError) return handleMutationError("删除学生失败", mutationError.message);
    await refreshStudents();
    return true;
  }

  function togglePinned(id: string) {
    setStudents((current) => {
      const next = current.map((student) => student.id === id ? { ...student, isPinned: !student.isPinned } : student);
      const pinned = Object.fromEntries(next.filter((student) => student.isPinned).map((student) => [student.id, true]));
      window.localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(pinned));
      return next;
    });
  }

  async function updateTargetSchools(id: string, schools: TargetSchool[]) {
    const { error: mutationError } = await supabase.from("students").update({ target_schools: schools }).eq("id", id);
    if (mutationError) return handleMutationError("保存目标院校失败", mutationError.message);
    await refreshStudents();
    return true;
  }

  async function updateHonors(id: string, honors: StudentHonors) {
    const { error: mutationError } = await supabase.from("students").update({ honors }).eq("id", id);
    if (mutationError) return handleMutationError("保存荣誉展示失败", mutationError.message);
    await refreshStudents();
    return true;
  }

  function handleMutationError(prefix: string, message: string) {
    console.error(`${prefix}:`, message);
    setError(`${prefix}：${message}`);
    return false;
  }

  return <StudentContext.Provider value={{ students, hydrated, dataSource, error, refreshStudents, addStudent, updateStudent, deleteStudent, togglePinned, updateTargetSchools, updateHonors }}>{children}</StudentContext.Provider>;
}

export function useStudents() {
  const context = useContext(StudentContext);
  if (!context) throw new Error("useStudents must be used inside StudentProvider");
  return context;
}
