import { BookOpen } from "lucide-react";
import "./requests.css";

export default function SubjectsLoading() {
  return (
    <main className="admin-content subjects-page" aria-busy="true">
      <div className="subjects-page-inner subjects-skeleton">
        <div className="subjects-page-title">
          <BookOpen size={28} aria-hidden="true" />
          <div className="subjects-skeleton-line" />
        </div>
        <div className="subjects-skeleton-card" />
        <div className="subjects-skeleton-card" />
        <div className="subjects-skeleton-card" />
      </div>
    </main>
  );
}
