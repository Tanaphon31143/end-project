"use client";
import { useState } from "react";
import { ChevronDown, FileSpreadsheet, Plus, UserPlus } from "lucide-react";
import StudentImportModal from "./StudentImportModal";
import { RippleButton } from "@/components/portal/RippleButton";
type Room = { id: number; name: string; level: string };
export default function StudentAddDropdown({
  classrooms,
  academicYear,
  semester,
  academicYears,
  onAddSingle,
  onEnrollExisting,
  onImportDone,
}: {
  classrooms: Room[];
  academicYear: string;
  semester: "1" | "2";
  academicYears: string[];
  onAddSingle: () => void;
  onEnrollExisting: () => void;
  onImportDone: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false),
    [importing, setImporting] = useState(false);
  return (
    <div className="student-add-launcher">
      <RippleButton
        className="admin-button primary"
        onClick={() => setOpen((x) => !x)}
      >
        <Plus size={18} />
        เพิ่มนักเรียน
        <ChevronDown size={15} />
      </RippleButton>
      {open && (
        <div className="student-add-menu">
          <button
            onClick={() => {
              setOpen(false);
              onAddSingle();
            }}
          >
            <UserPlus size={17} />
            <span>
              <b>เพิ่มนักเรียนทีละคน</b>
              <small>กรอกข้อมูลนักเรียนด้วยฟอร์ม</small>
            </span>
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onEnrollExisting();
            }}
          >
            <UserPlus size={17} />
            <span>
              <b>เพิ่มบัญชีเดิมเข้าเทอม</b>
              <small>ค้นหาด้วยรหัสนักเรียนหรืออีเมล</small>
            </span>
          </button>
          <button
            onClick={() => {
              setOpen(false);
              setImporting(true);
            }}
          >
            <FileSpreadsheet size={17} />
            <span>
              <b>นำเข้าจากไฟล์ Excel</b>
              <small>เพิ่มนักเรียนพร้อมกันหลายคน</small>
            </span>
          </button>
        </div>
      )}
      {importing && (
        <StudentImportModal
          classrooms={classrooms}
          academicYear={academicYear}
          semester={semester}
          academicYears={academicYears}
          onDone={onImportDone}
          onClose={() => setImporting(false)}
        />
      )}
    </div>
  );
}
