import { Link } from "react-router-dom";
import { ShieldCheck, Mail, ArrowLeft } from "lucide-react";
import logoSstlink from "@/assets/logo-sstlink.png";

export default function Privacidad() {
  const vigencia = new Date().toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="border-b border-[#E2E8F0] bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoSstlink} alt="SSTLink" className="h-8 w-auto" />
            <span className="text-[14px] font-semibold text-[#0F172A]">
              SST<span className="text-[#F97316]">Link</span>
            </span>
          </Link>
          <Link
            to="/"
            className="text-xs text-[#64748B] hover:text-[#0F172A] flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Volver
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-[#F97316]/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-[#F97316]" />
          </div>
          <div>
            <h1 className="text-[24px] font-bold text-[#0F172A] leading-tight">
              Política de Tratamiento de Datos Personales
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013 de la República de Colombia
            </p>
          </div>
        </div>

        <article className="bg-white rounded-xl border border-[#E2E8F0] p-8 space-y-7 text-[14px] text-[#334155] leading-relaxed">
          <Section title="1. Responsable del tratamiento">
            <p>
              <strong className="text-[#0F172A]">SSTLink</strong>, plataforma de gestión del
              Sistema de Seguridad y Salud en el Trabajo (SG-SST) para empleadores colombianos.
            </p>
            <p className="flex items-center gap-2 mt-2">
              <Mail className="w-4 h-4 text-[#F97316]" />
              <a
                href="mailto:privacidad@sstlink.co"
                className="text-[#F97316] font-medium hover:underline"
              >
                privacidad@sstlink.co
              </a>
            </p>
          </Section>

          <Section title="2. Finalidad del tratamiento">
            <p>
              Los datos personales recolectados por SSTLink se tratan exclusivamente con la
              finalidad de apoyar a empleadores colombianos en la gestión de su Sistema de
              Seguridad y Salud en el Trabajo, incluyendo el control de trabajadores, exámenes
              médicos ocupacionales, accidentalidad, ausentismo, capacitaciones, inspecciones y
              reportes ante autoridades competentes (ARL, Ministerio del Trabajo).
            </p>
          </Section>

          <Section title="3. Datos personales recolectados">
            <ul className="list-disc pl-5 space-y-1">
              <li>Datos de identificación: nombres, apellidos, tipo y número de documento.</li>
              <li>Datos de contacto: correo electrónico, teléfono, dirección.</li>
              <li>Datos laborales: cargo, sede, tipo de contrato, fecha de ingreso, salario.</li>
              <li>
                Datos de salud ocupacional: exámenes médicos, conceptos de aptitud, accidentes,
                ausencias, vacunación, antecedentes de salud.
              </li>
              <li>Datos sociodemográficos: género, fecha de nacimiento, RH, estado civil.</li>
            </ul>
          </Section>

          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800">
            ⚠ <strong>Datos sensibles:</strong> los datos de salud (exámenes médicos,
            accidentalidad, restricciones) son <strong>datos sensibles</strong> conforme al
            Art. 5 de la Ley 1581 de 2012 y solo se tratan con finalidad de cumplimiento del
            SG-SST. Su tratamiento requiere autorización expresa del titular.
          </div>

          <Section title="4. Derechos del titular (ARCO)">
            <p>Como titular de los datos, usted tiene derecho a:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                <strong>Acceso:</strong> conocer los datos que tenemos sobre usted.
              </li>
              <li>
                <strong>Rectificación:</strong> actualizar o corregir datos inexactos.
              </li>
              <li>
                <strong>Cancelación:</strong> solicitar la supresión de sus datos.
              </li>
              <li>
                <strong>Oposición:</strong> oponerse al tratamiento de sus datos.
              </li>
              <li>Revocar la autorización otorgada.</li>
              <li>Presentar quejas ante la Superintendencia de Industria y Comercio (SIC).</li>
            </ul>
          </Section>

          <Section title="5. Canal para ejercer derechos">
            <p>
              Para ejercer cualquiera de los derechos anteriores, el titular puede escribir a:{" "}
              <a
                href="mailto:privacidad@sstlink.co"
                className="text-[#F97316] font-medium hover:underline"
              >
                privacidad@sstlink.co
              </a>
              . Responderemos su solicitud en un plazo máximo de quince (15) días hábiles.
            </p>
          </Section>

          <Section title="6. Seguridad de la información">
            <p>
              SSTLink implementa medidas técnicas y administrativas razonables para proteger los
              datos personales contra pérdida, acceso no autorizado, alteración o divulgación.
              El acceso a los datos se controla mediante autenticación y políticas de seguridad
              a nivel de fila (RLS).
            </p>
          </Section>

          <Section title="7. Vigencia">
            <p>
              La presente política entra en vigencia el <strong>{vigencia}</strong> y permanecerá
              vigente mientras SSTLink mantenga relación con el titular o sea necesario para el
              cumplimiento de obligaciones legales.
            </p>
          </Section>
        </article>

        <p className="text-[11px] text-[#94A3B8] text-center mt-6">
          © {new Date().getFullYear()} SSTLink · Colombia
        </p>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[16px] font-semibold text-[#0F172A] mb-2">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
