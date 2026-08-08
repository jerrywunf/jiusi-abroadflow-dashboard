export type LanguageTestType = "IELTS" | "TOEFL" | "Duolingo" | "";
export type StudentStatus = "规划中" | "材料准备" | "申请中" | "已录取";
export type SchoolLevel = "冲刺" | "匹配" | "稳妥";
export type TargetSchool = { name: string; level: SchoolLevel; logo: string };

export type Student = {
  id: string;
  name: string;
  email: string;
  grade: string;
  targetCountry: string;
  targetMajor: string;
  intake: string;
  gpa: string;
  languageTest: { type: LanguageTestType; score: string };
  sat: string;
  counselor: string;
  status: StudentStatus;
  progress: number;
  isPinned: boolean;
  targetSchools: TargetSchool[];
  color: string;
  updated: string;
};

export type StudentFormValues = Pick<Student, "name" | "email" | "grade" | "targetCountry" | "targetMajor" | "intake" | "gpa" | "languageTest" | "sat">;

export const STUDENTS_STORAGE_KEY = "abroadflow.students.v1";

export const defaultTargetSchools: TargetSchool[] = [
  { name: "UCB", level: "冲刺", logo: "" },
  { name: "NYU", level: "匹配", logo: "" },
  { name: "USC", level: "稳妥", logo: "" }
];

export const seedStudents: Student[] = [
  { id: "1", name: "林知夏", email: "zhixia.lin@example.com", grade: "高二", targetCountry: "英国", targetMajor: "商科", intake: "2026 秋", gpa: "3.8 / 4.0", languageTest: { type: "IELTS", score: "7.0" }, sat: "1450", counselor: "陈老师", status: "申请中", progress: 72, isPinned: false, targetSchools: defaultTargetSchools, color: "bg-emerald-100 text-emerald-700", updated: "今天 09:42" },
  { id: "2", name: "周予安", email: "yuan.zhou@example.com", grade: "高二", targetCountry: "美国", targetMajor: "计算机", intake: "2026 秋", gpa: "3.9 / 4.0", languageTest: { type: "TOEFL", score: "105" }, sat: "1510", counselor: "苏老师", status: "材料准备", progress: 48, isPinned: false, targetSchools: defaultTargetSchools, color: "bg-violet-100 text-violet-700", updated: "昨天 16:20" },
  { id: "3", name: "沈亦辰", email: "yichen.shen@example.com", grade: "高三", targetCountry: "澳洲", targetMajor: "传媒", intake: "2026 春", gpa: "3.7 / 4.0", languageTest: { type: "IELTS", score: "7.0" }, sat: "", counselor: "陈老师", status: "已录取", progress: 100, isPinned: false, targetSchools: defaultTargetSchools, color: "bg-amber-100 text-amber-700", updated: "8月2日" },
  { id: "4", name: "许言清", email: "yanqing.xu@example.com", grade: "高一", targetCountry: "加拿大", targetMajor: "金融", intake: "2027 春", gpa: "3.6 / 4.0", languageTest: { type: "Duolingo", score: "125" }, sat: "1380", counselor: "王老师", status: "规划中", progress: 18, isPinned: false, targetSchools: defaultTargetSchools, color: "bg-sky-100 text-sky-700", updated: "7月31日" },
  { id: "5", name: "唐沐川", email: "muchuan.tang@example.com", grade: "高二", targetCountry: "新加坡", targetMajor: "数据科学", intake: "2026 秋", gpa: "3.85 / 4.0", languageTest: { type: "IELTS", score: "7.0" }, sat: "1480", counselor: "苏老师", status: "申请中", progress: 65, isPinned: false, targetSchools: defaultTargetSchools, color: "bg-rose-100 text-rose-700", updated: "7月29日" },
  { id: "6", name: "顾念一", email: "nianyi.gu@example.com", grade: "高二", targetCountry: "中国香港", targetMajor: "教育", intake: "2026 秋", gpa: "3.7 / 4.0", languageTest: { type: "IELTS", score: "6.5" }, sat: "1420", counselor: "王老师", status: "材料准备", progress: 36, isPinned: false, targetSchools: defaultTargetSchools, color: "bg-cyan-100 text-cyan-700", updated: "7月28日" }
];

export const emptyStudentForm: StudentFormValues = {
  name: "", email: "", grade: "", targetCountry: "", targetMajor: "", intake: "2026 秋",
  gpa: "", languageTest: { type: "", score: "" }, sat: ""
};

export function studentTarget(student: Student) {
  return [student.targetCountry, student.targetMajor].filter(Boolean).join(" · ") || "待完善";
}
