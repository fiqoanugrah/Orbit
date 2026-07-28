"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { ImagePlus, Trash2, UserPlus } from "lucide-react";

import {
  createStudent,
  deleteStudent,
  type StudentActionState,
  updateStudent,
} from "@/app/app/students/actions";
import { PendingButton } from "@/components/pending-button";

const initialStudentActionState: StudentActionState = {
  message: null,
  status: "idle",
};

type ParentOption = {
  id: string;
  name: string;
};

type StudentFormData = {
  birthDate: string;
  id: string;
  name: string;
  notes: string;
  parentId: string;
  phone: string;
  photoUrl: string;
};

function ActionMessage({
  message,
  status,
}: {
  message: string | null;
  status: "idle" | "error" | "success";
}) {
  if (!message) {
    return null;
  }

  return (
    <p
      className={`rounded-md px-3 py-2 text-xs font-semibold ${
        status === "success"
          ? "bg-[#e7f8ef] text-[#16834a]"
          : "bg-[#ffecec] text-[#c73535]"
      }`}
    >
      {message}
    </p>
  );
}

function useRefreshOnSuccess(status: "idle" | "error" | "success") {
  const router = useRouter();

  useEffect(() => {
    if (status === "success") {
      router.refresh();
    }
  }, [router, status]);
}

export function StudentCreateForm({
  canManageStudents,
  parents,
}: {
  canManageStudents: boolean;
  parents: ParentOption[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(
    createStudent,
    initialStudentActionState,
  );

  useRefreshOnSuccess(state.status);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <form ref={formRef} action={action} className="grid gap-4 pt-5">
      <ActionMessage message={state.message} status={state.status} />
      <label className="grid gap-2 rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-3">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <ImagePlus className="size-4" aria-hidden="true" />
          Foto student
        </span>
        <input
          name="photo"
          type="file"
          accept="image/*"
          disabled={!canManageStudents}
          className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#eaf2ff] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#075bc9] disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
        />
      </label>
      <label className="grid gap-2">
        <span className="text-sm font-semibold">Nama student</span>
        <input
          name="name"
          required
          minLength={2}
          disabled={!canManageStudents}
          placeholder="Nama murid"
          className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-semibold">Parent</span>
          <select
            name="parentId"
            disabled={!canManageStudents}
            className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
          >
            <option value="">Tanpa parent</option>
            {parents.map((parent) => (
              <option key={parent.id} value={parent.id}>
                {parent.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold">Tanggal lahir</span>
          <input
            name="birthDate"
            type="date"
            disabled={!canManageStudents}
            className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
          />
        </label>
      </div>
      <label className="grid gap-2">
        <span className="text-sm font-semibold">Phone</span>
        <input
          name="phone"
          disabled={!canManageStudents}
          placeholder="Nomor murid jika ada"
          className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
        />
      </label>
      <label className="grid gap-2">
        <span className="text-sm font-semibold">Catatan</span>
        <textarea
          name="notes"
          rows={3}
          disabled={!canManageStudents}
          placeholder="Catatan internal"
          className="resize-none rounded-md border border-[#d7e0ea] bg-white px-3 py-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
        />
      </label>
      <PendingButton
        disabled={!canManageStudents}
        className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#0b6ffb] px-4 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:cursor-wait disabled:bg-[#b9c7d8]"
        pendingChildren="Menambahkan student..."
      >
        <UserPlus className="size-4" aria-hidden="true" />
        Tambah Student
      </PendingButton>
    </form>
  );
}

export function StudentEditForm({
  canManageStudents,
  parents,
  student,
}: {
  canManageStudents: boolean;
  parents: ParentOption[];
  student: StudentFormData;
}) {
  const [state, action] = useActionState(
    updateStudent,
    initialStudentActionState,
  );

  useRefreshOnSuccess(state.status);

  return (
    <form action={action} className="mt-3 grid gap-3">
      <ActionMessage message={state.message} status={state.status} />
      <input type="hidden" name="studentId" value={student.id} />
      <label className="grid gap-2 rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-3">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <ImagePlus className="size-4" aria-hidden="true" />
          Foto student
        </span>
        {student.photoUrl ? (
          <img
            src={student.photoUrl}
            alt=""
            className="size-16 rounded-md border border-[#d7e0ea] object-cover"
          />
        ) : null}
        <input
          name="photo"
          type="file"
          accept="image/*"
          disabled={!canManageStudents}
          className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#eaf2ff] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#075bc9] disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
        />
      </label>
      <input
        name="name"
        required
        minLength={2}
        defaultValue={student.name}
        disabled={!canManageStudents}
        className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <select
          name="parentId"
          defaultValue={student.parentId}
          disabled={!canManageStudents}
          className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
        >
          <option value="">Tanpa parent</option>
          {parents.map((parent) => (
            <option key={parent.id} value={parent.id}>
              {parent.name}
            </option>
          ))}
        </select>
        <input
          name="birthDate"
          type="date"
          defaultValue={student.birthDate}
          disabled={!canManageStudents}
          className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
        />
      </div>
      <input
        name="phone"
        defaultValue={student.phone}
        disabled={!canManageStudents}
        placeholder="Phone"
        className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
      />
      <textarea
        name="notes"
        rows={3}
        defaultValue={student.notes}
        disabled={!canManageStudents}
        placeholder="Catatan"
        className="resize-none rounded-md border border-[#d7e0ea] bg-white px-3 py-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
      />
      <PendingButton
        disabled={!canManageStudents}
        className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm font-semibold text-[#536174] transition hover:bg-[#f1f5f9] disabled:cursor-wait disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
        pendingChildren="Saving..."
      >
        Save Student
      </PendingButton>
    </form>
  );
}

export function StudentDeleteForm({
  canDelete,
  studentId,
}: {
  canDelete: boolean;
  studentId: string;
}) {
  const [state, action] = useActionState(
    deleteStudent,
    initialStudentActionState,
  );

  useRefreshOnSuccess(state.status);

  return (
    <form action={action} className="mt-3">
      <ActionMessage message={state.message} status={state.status} />
      <input type="hidden" name="studentId" value={studentId} />
      <PendingButton
        disabled={!canDelete}
        className="mt-2 flex h-9 items-center gap-2 rounded-md border border-[#f4c6c6] bg-white px-3 text-xs font-semibold text-[#c73535] transition hover:bg-[#fff4f4] disabled:cursor-not-allowed disabled:bg-[#f6f8fb] disabled:text-[#d8a4a4]"
        pendingChildren="Deleting..."
      >
        <Trash2 className="size-3.5" aria-hidden="true" />
        Delete Student
      </PendingButton>
    </form>
  );
}
