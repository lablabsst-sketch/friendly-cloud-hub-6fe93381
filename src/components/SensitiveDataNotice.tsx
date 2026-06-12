import { Link } from "react-router-dom";

/**
 * Aviso de tratamiento de datos sensibles conforme a la Ley 1581 de 2012.
 * Úsalo en formularios donde se capturen datos de salud (exámenes, accidentes, ausencias).
 */
export function SensitiveDataNotice({ className = "" }: { className?: string }) {
  return (
    <div
      role="note"
      className={`bg-amber-50 border border-amber-200 text-amber-800 text-xs p-2 rounded ${className}`}
    >
      ⚠ Los datos ingresados son <strong>datos sensibles de salud</strong>. Su tratamiento se
      realiza con fines exclusivos de gestión SST conforme a la{" "}
      <Link to="/privacidad" className="underline font-medium hover:text-amber-900">
        Ley 1581 de 2012
      </Link>
      .
    </div>
  );
}
