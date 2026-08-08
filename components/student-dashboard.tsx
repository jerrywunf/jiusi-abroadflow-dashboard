"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useStudents } from "@/components/student-provider";
import { emptyStudentForm, LanguageTestType, StudentFormValues, StudentStatus, studentTarget } from "@/lib/students";
import {
  BarChart3, Bell, BookOpen, ChevronDown, CircleHelp, FileCheck2, GraduationCap, LayoutDashboard,
  Menu, MoreHorizontal, Pin, PinOff, Plus, Search, Settings, SlidersHorizontal, Sparkles, Trash2, TriangleAlert, Users, X
} from "lucide-react";

const nav = [
  [LayoutDashboard, "工作台"], [Users, "学生管理"], [FileCheck2, "申请管理"],
  [BookOpen, "院校库"], [Sparkles, "AI 规划助手"], [BarChart3, "月度报告"],
  [TriangleAlert, "风险提示"]
] as const;

type StudentFilters = { intake: string; counselor: string; target: string };
const emptyFilters: StudentFilters = { intake: "", counselor: "", target: "" };

const statusStyle: Record<StudentStatus, string> = {
  "规划中": "bg-slate-100 text-slate-600", "材料准备": "bg-amber-50 text-amber-700",
  "申请中": "bg-blue-50 text-blue-700", "已录取": "bg-emerald-50 text-emerald-700"
};

export function StudentDashboard() {
  const { students, addStudent, deleteStudent, togglePinned, error } = useStudents();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("全部状态");
  const [open, setOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<StudentFilters>(emptyFilters);
  const [draftFilters, setDraftFilters] = useState<StudentFilters>(emptyFilters);
  const [mobileNav, setMobileNav] = useState(false);
  const [rowMenu, setRowMenu] = useState<{ id: string; top: number; right: number } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filterOptions = useMemo(() => ({
    intakes: Array.from(new Set(students.map((student) => student.intake))),
    counselors: Array.from(new Set(students.map((student) => student.counselor))),
    targets: Array.from(new Set(students.map(studentTarget)))
  }), [students]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const visible = useMemo(() => students.filter((s) => {
    const target = studentTarget(s);
    const matchesQuery = `${s.name}${s.email}${target}${s.counselor}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery
      && (status === "全部状态" || s.status === status)
      && (!filters.intake || s.intake === filters.intake)
      && (!filters.counselor || s.counselor === filters.counselor)
      && (!filters.target || target === filters.target);
  }).sort((a, b) => Number(b.isPinned) - Number(a.isPinned)), [filters, query, status, students]);

  const menuStudent = rowMenu ? students.find((student) => student.id === rowMenu.id) : null;
  const deleteStudentName = deleteId ? students.find((student) => student.id === deleteId)?.name : "";

  return (
    <div className="min-h-screen bg-[#f7f9f8]">
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200 bg-white px-4 py-5 transition-transform lg:translate-x-0 ${mobileNav ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white"><GraduationCap size={20}/></span><div><p className="font-semibold tracking-tight">玖肆留学</p><p className="text-[11px] text-slate-400">Jiusi Education</p></div></div>
          <button className="lg:hidden" onClick={() => setMobileNav(false)} aria-label="关闭导航"><X size={20}/></button>
        </div>
        <nav className="mt-9 space-y-1">
          {nav.map(([Icon, label]) => <button key={label} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${label === "学生管理" ? "bg-brand-50 font-medium text-brand-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}><Icon size={18}/>{label}{label === "申请管理" && <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[11px]">12</span>}</button>)}
        </nav>
        <div className="absolute inset-x-4 bottom-5 space-y-1 border-t border-slate-100 pt-4">
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-50"><CircleHelp size={18}/>帮助中心</button>
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-50"><Settings size={18}/>系统设置</button>
          <div className="mt-3 flex items-center gap-3 px-3 pt-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-xs font-semibold text-white">YC</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">玖肆</p><p className="truncate text-xs text-slate-400">高级顾问</p></div><ChevronDown size={15} className="text-slate-400"/></div>
        </div>
      </aside>

      {mobileNav && <button className="fixed inset-0 z-30 bg-black/20 lg:hidden" onClick={() => setMobileNav(false)} aria-label="关闭导航遮罩"/>}

      <main className="lg:pl-64">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3"><button className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" onClick={() => setMobileNav(true)} aria-label="打开导航"><Menu size={20}/></button><span className="text-sm text-slate-400">学生管理</span><span className="text-slate-300">/</span><span className="text-sm font-medium">全部学生</span></div>
          <button className="relative rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" aria-label="通知"><Bell size={18}/><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-white"/></button>
        </header>

        <div className="mx-auto max-w-[1500px] p-4 md:p-8">
          <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="mb-1 text-sm font-medium text-brand-600">STUDENT HUB</p><h1 className="text-2xl font-semibold tracking-tight md:text-3xl">学生管理</h1><p className="mt-2 text-sm text-slate-500">集中管理学生档案，清晰跟进每一个申请节点。</p></div>
            <div className="flex gap-2">
              <Dialog.Root open={filterOpen} onOpenChange={(nextOpen) => { setFilterOpen(nextOpen); if (nextOpen) setDraftFilters(filters); }}>
                <Dialog.Trigger asChild><button className="relative inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 shadow-sm transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"><SlidersHorizontal size={17}/>筛选{activeFilterCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[11px] text-white">{activeFilterCount}</span>}</button></Dialog.Trigger>
                <FilterDialog filters={draftFilters} options={filterOptions} onChange={setDraftFilters} onReset={() => setDraftFilters(emptyFilters)} onApply={() => { setFilters(draftFilters); setFilterOpen(false); }}/>
              </Dialog.Root>
              <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Trigger asChild><button className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"><Plus size={17}/>添加学生</button></Dialog.Trigger><AddStudentDialog onSubmit={async (values) => { const saved = await addStudent(values); if (saved) setOpen(false); return saved; }}/></Dialog.Root>
            </div>
          </section>
          {error && <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

          <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="学生总数" value={students.length.toString()} note="较上月 +3" icon={Users} tone="brand"/>
            <Metric label="进行中申请" value="12" note="4 项本周截止" icon={FileCheck2} tone="blue"/>
            <Metric label="录取数" value="8" note="率 76%" icon={GraduationCap} tone="amber"/>
            <Metric label="待办事项" value="19" note="6 项需要关注" icon={Bell} tone="violet"/>
          </section>

          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between md:p-5">
              <div><h2 className="font-semibold">全部学生</h2><p className="mt-1 text-xs text-slate-400">共 {students.length} 位学生 · 显示 {visible.length} 条</p></div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(e) => setQuery(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 sm:w-64" placeholder="搜索姓名、方向或顾问"/></label>
                <label className="relative"><SlidersHorizontal size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-sm outline-none focus:border-brand-500 sm:w-36"><option>全部状态</option><option>规划中</option><option>材料准备</option><option>申请中</option><option>已录取</option></select><ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"/></label>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left"><thead><tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-400"><th className="px-5 py-3.5">学生</th><th className="px-4 py-3.5">目标方向</th><th className="px-4 py-3.5">入学季</th><th className="px-4 py-3.5">负责顾问</th><th className="px-4 py-3.5">当前阶段</th><th className="px-4 py-3.5">整体进度</th><th className="px-4 py-3.5">最近更新</th><th className="px-4 py-3.5"/></tr></thead>
                <tbody>{visible.map((s, index) => <tr key={s.id} className="animate-enter border-b border-slate-100 last:border-0 hover:bg-slate-50/50" style={{animationDelay: `${index * 35}ms`}}><td className="px-5 py-4"><div className="flex items-center gap-3"><span className={`grid h-10 w-10 place-items-center rounded-full text-sm font-semibold ${s.color}`}>{s.name.slice(0, 1)}</span><div><div className="flex items-center gap-1.5"><Link href={`/students/${s.id}`} className="text-sm font-medium transition hover:text-brand-700 hover:underline">{s.name}</Link>{s.isPinned && <Pin size={13} className="fill-brand-100 text-brand-600" aria-label="已置顶"/>}</div><p className="mt-0.5 text-xs text-slate-400">{s.email}</p></div></div></td><td className="px-4 py-4 text-sm text-slate-600">{studentTarget(s)}</td><td className="px-4 py-4 text-sm text-slate-600">{s.intake}</td><td className="px-4 py-4 text-sm text-slate-600">{s.counselor}</td><td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle[s.status]}`}>{s.status}</span></td><td className="px-4 py-4"><div className="flex items-center gap-2"><div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{width: `${s.progress}%`}}/></div><span className="text-xs tabular-nums text-slate-500">{s.progress}%</span></div></td><td className="px-4 py-4 text-xs text-slate-400">{s.updated}</td><td className="px-4 py-4"><button onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); setRowMenu((current) => current?.id === s.id ? null : { id: s.id, top: rect.bottom + 6, right: window.innerWidth - rect.right }); }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={`管理${s.name}`} aria-expanded={rowMenu?.id === s.id}><MoreHorizontal size={17}/></button></td></tr>)}</tbody></table>
              {visible.length === 0 && <div className="grid place-items-center px-4 py-16 text-center"><Search className="mb-3 text-slate-300"/><p className="font-medium">没有找到匹配的学生</p><p className="mt-1 text-sm text-slate-400">试试调整关键词或筛选条件</p></div>}
            </div>
          </section>
        </div>
      </main>
      {rowMenu && menuStudent && createPortal(<><button className="fixed inset-0 z-40 cursor-default" aria-label="关闭学生操作菜单" onClick={() => setRowMenu(null)}/><div role="menu" aria-label={`${menuStudent.name}操作菜单`} className="fixed z-50 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl" style={{ top: rowMenu.top, right: rowMenu.right }}><button role="menuitem" onClick={() => { togglePinned(menuStudent.id); setRowMenu(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50">{menuStudent.isPinned ? <PinOff size={16}/> : <Pin size={16}/>} {menuStudent.isPinned ? "取消置顶" : "置顶学生"}</button><button role="menuitem" onClick={() => { setDeleteId(menuStudent.id); setRowMenu(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"><Trash2 size={16}/>删除学生</button></div></>, document.body)}
      <Dialog.Root open={Boolean(deleteId)} onOpenChange={(open) => { if (!open) setDeleteId(null); }}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm"/><Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl"><Dialog.Title className="text-lg font-semibold">删除学生</Dialog.Title><Dialog.Description className="mt-2 text-sm leading-6 text-slate-500">确认删除该学生？<br/>删除后无法恢复。</Dialog.Description>{deleteStudentName && <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">{deleteStudentName}</p>}<div className="mt-6 flex justify-end gap-2"><Dialog.Close className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50">取消</Dialog.Close><button onClick={async () => { if (deleteId && await deleteStudent(deleteId)) setDeleteId(null); }} className="h-10 rounded-xl bg-rose-600 px-4 text-sm font-medium text-white hover:bg-rose-700">确认删除</button></div></Dialog.Content></Dialog.Portal></Dialog.Root>
    </div>
  );
}

function Metric({ label, value, note, icon: Icon, tone }: { label: string; value: string; note: string; icon: typeof Users; tone: "brand" | "blue" | "amber" | "violet" }) {
  const tones = { brand: "bg-brand-50 text-brand-600", blue: "bg-blue-50 text-blue-600", amber: "bg-amber-50 text-amber-600", violet: "bg-violet-50 text-violet-600" };
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"><div className="flex items-start justify-between"><div><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p></div><span className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}><Icon size={19}/></span></div><p className="mt-3 text-xs text-slate-400">{note}</p></div>;
}

function FilterDialog({ filters, options, onChange, onReset, onApply }: {
  filters: StudentFilters;
  options: { intakes: string[]; counselors: string[]; targets: string[] };
  onChange: (filters: StudentFilters) => void;
  onReset: () => void;
  onApply: () => void;
}) {
  const field = "mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
  const update = (key: keyof StudentFilters, value: string) => onChange({ ...filters, [key]: value });

  return <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm"/><Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><Dialog.Title className="text-lg font-semibold">筛选学生</Dialog.Title><Dialog.Description className="mt-1 text-sm text-slate-500">组合条件，快速找到符合要求的学生。</Dialog.Description></div><Dialog.Close className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18}/></Dialog.Close></div><div className="mt-6 grid gap-4"><label className="text-sm text-slate-600">入学季<select value={filters.intake} onChange={(event) => update("intake", event.target.value)} className={field}><option value="">全部入学季</option>{options.intakes.map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-sm text-slate-600">负责顾问<select value={filters.counselor} onChange={(event) => update("counselor", event.target.value)} className={field}><option value="">全部顾问</option>{options.counselors.map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-sm text-slate-600">目标方向<select value={filters.target} onChange={(event) => update("target", event.target.value)} className={field}><option value="">全部目标方向</option>{options.targets.map((item) => <option key={item}>{item}</option>)}</select></label></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onReset} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50">重置</button><button type="button" onClick={onApply} className="h-10 rounded-xl bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700">应用筛选</button></div></Dialog.Content></Dialog.Portal>;
}

function AddStudentDialog({ onSubmit }: { onSubmit: (values: StudentFormValues) => Promise<boolean> }) {
  const [values, setValues] = useState<StudentFormValues>(emptyStudentForm);
  const [submitting, setSubmitting] = useState(false);
  const field = "mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
  const update = (key: keyof Omit<StudentFormValues, "languageTest">, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const setLanguageType = (type: LanguageTestType) => setValues((current) => ({ ...current, languageTest: { type, score: type ? current.languageTest.score : "" } }));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    const saved = await onSubmit(values);
    setSubmitting(false);
    if (saved) setValues(emptyStudentForm);
  }

  return <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm"/><Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><Dialog.Title className="text-lg font-semibold">添加学生</Dialog.Title><Dialog.Description className="mt-1 text-sm text-slate-500">创建完整的学生基础档案，保存后会立即加入列表。</Dialog.Description></div><Dialog.Close className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18}/></Dialog.Close></div><form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-sm text-slate-600">姓名<input required value={values.name} onChange={(event) => update("name", event.target.value)} placeholder="例如：陈晓宁" className={field}/></label><label className="text-sm text-slate-600">邮箱<input required type="email" value={values.email} onChange={(event) => update("email", event.target.value)} placeholder="student@example.com" className={field}/></label><label className="text-sm text-slate-600">年级<input required value={values.grade} onChange={(event) => update("grade", event.target.value)} placeholder="例如：高二" className={field}/></label><label className="text-sm text-slate-600">计划入学<select value={values.intake} onChange={(event) => update("intake", event.target.value)} className={field}><option>2026 秋</option><option>2027 春</option><option>2027 秋</option><option>2028 春</option></select></label><label className="text-sm text-slate-600">目标国家<input required value={values.targetCountry} onChange={(event) => update("targetCountry", event.target.value)} placeholder="例如：美国" className={field}/></label><label className="text-sm text-slate-600">目标专业<input required value={values.targetMajor} onChange={(event) => update("targetMajor", event.target.value)} placeholder="例如：计算机" className={field}/></label><label className="text-sm text-slate-600">GPA<input value={values.gpa} onChange={(event) => update("gpa", event.target.value)} placeholder="例如：3.8 / 4.0" className={field}/></label><label className="text-sm text-slate-600">SAT<input value={values.sat} onChange={(event) => update("sat", event.target.value)} placeholder="例如：1450" className={field}/></label><label className="text-sm text-slate-600">语言考试类型<select value={values.languageTest.type} onChange={(event) => setLanguageType(event.target.value as LanguageTestType)} className={field}><option value="">暂无</option><option>IELTS</option><option>TOEFL</option><option>Duolingo</option></select></label>{values.languageTest.type && <label className="text-sm text-slate-600">{values.languageTest.type} 成绩<input required value={values.languageTest.score} onChange={(event) => setValues((current) => ({ ...current, languageTest: { ...current.languageTest, score: event.target.value } }))} placeholder={`请输入 ${values.languageTest.type} 成绩`} className={field}/></label>}<div className="mt-2 flex justify-end gap-2 sm:col-span-2"><Dialog.Close disabled={submitting} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">取消</Dialog.Close><button disabled={submitting} type="submit" className="h-10 rounded-xl bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-wait disabled:opacity-60">{submitting ? "保存中..." : "创建档案"}</button></div></form></Dialog.Content></Dialog.Portal>;
}
