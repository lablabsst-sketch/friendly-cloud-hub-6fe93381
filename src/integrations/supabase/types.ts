export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accidentes: {
        Row: {
          created_at: string
          descripcion: string | null
          dias_incapacidad: number | null
          empresa_id: string
          estado: string
          fecha: string
          id: string
          lugar: string | null
          parte_cuerpo: string | null
          reportado_arl: boolean | null
          severidad: string | null
          tipo: string | null
          trabajador_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          dias_incapacidad?: number | null
          empresa_id: string
          estado?: string
          fecha: string
          id?: string
          lugar?: string | null
          parte_cuerpo?: string | null
          reportado_arl?: boolean | null
          severidad?: string | null
          tipo?: string | null
          trabajador_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          dias_incapacidad?: number | null
          empresa_id?: string
          estado?: string
          fecha?: string
          id?: string
          lugar?: string | null
          parte_cuerpo?: string | null
          reportado_arl?: boolean | null
          severidad?: string | null
          tipo?: string | null
          trabajador_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accidentes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accidentes_trabajador_id_fkey"
            columns: ["trabajador_id"]
            isOneToOne: false
            referencedRelation: "trabajadores"
            referencedColumns: ["id"]
          },
        ]
      }
      acciones_correctivas: {
        Row: {
          created_at: string | null
          descripcion: string
          empresa_id: string
          estado: string | null
          fecha_limite: string | null
          id: string
          inspeccion_id: string | null
          responsable: string | null
          responsable_id: string | null
          tarea_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descripcion: string
          empresa_id: string
          estado?: string | null
          fecha_limite?: string | null
          id?: string
          inspeccion_id?: string | null
          responsable?: string | null
          responsable_id?: string | null
          tarea_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descripcion?: string
          empresa_id?: string
          estado?: string | null
          fecha_limite?: string | null
          id?: string
          inspeccion_id?: string | null
          responsable?: string | null
          responsable_id?: string | null
          tarea_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acciones_correctivas_inspeccion_id_fkey"
            columns: ["inspeccion_id"]
            isOneToOne: false
            referencedRelation: "inspecciones"
            referencedColumns: ["id"]
          },
        ]
      }
      actividades_plan_anual: {
        Row: {
          actividad: string
          categoria: string
          created_at: string
          empresa_id: string
          estado: string
          id: string
          indicador: string | null
          meses: number[]
          objetivo: string | null
          observaciones: string | null
          plan_id: string
          porcentaje_avance: number
          presupuesto: number | null
          recursos: string | null
          responsable: string | null
          updated_at: string
        }
        Insert: {
          actividad: string
          categoria?: string
          created_at?: string
          empresa_id: string
          estado?: string
          id?: string
          indicador?: string | null
          meses?: number[]
          objetivo?: string | null
          observaciones?: string | null
          plan_id: string
          porcentaje_avance?: number
          presupuesto?: number | null
          recursos?: string | null
          responsable?: string | null
          updated_at?: string
        }
        Update: {
          actividad?: string
          categoria?: string
          created_at?: string
          empresa_id?: string
          estado?: string
          id?: string
          indicador?: string | null
          meses?: number[]
          objetivo?: string | null
          observaciones?: string | null
          plan_id?: string
          porcentaje_avance?: number
          presupuesto?: number | null
          recursos?: string | null
          responsable?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "actividades_plan_anual_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividades_plan_anual_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plan_anual"
            referencedColumns: ["id"]
          },
        ]
      }
      activos: {
        Row: {
          asignado_a: string | null
          created_at: string
          empresa_id: string
          estado: string
          fecha_adquisicion: string | null
          id: string
          nombre: string
          serial: string | null
          tipo: string | null
          ubicacion: string | null
          updated_at: string
          valor: number | null
        }
        Insert: {
          asignado_a?: string | null
          created_at?: string
          empresa_id: string
          estado?: string
          fecha_adquisicion?: string | null
          id?: string
          nombre: string
          serial?: string | null
          tipo?: string | null
          ubicacion?: string | null
          updated_at?: string
          valor?: number | null
        }
        Update: {
          asignado_a?: string | null
          created_at?: string
          empresa_id?: string
          estado?: string
          fecha_adquisicion?: string | null
          id?: string
          nombre?: string
          serial?: string | null
          tipo?: string | null
          ubicacion?: string | null
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "activos_asignado_a_fkey"
            columns: ["asignado_a"]
            isOneToOne: false
            referencedRelation: "trabajadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      asistencia_capacitacion: {
        Row: {
          asistio: boolean | null
          capacitacion_id: string
          created_at: string
          empresa_id: string
          id: string
          nota: number | null
          trabajador_id: string
        }
        Insert: {
          asistio?: boolean | null
          capacitacion_id: string
          created_at?: string
          empresa_id: string
          id?: string
          nota?: number | null
          trabajador_id: string
        }
        Update: {
          asistio?: boolean | null
          capacitacion_id?: string
          created_at?: string
          empresa_id?: string
          id?: string
          nota?: number | null
          trabajador_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asistencia_capacitacion_capacitacion_id_fkey"
            columns: ["capacitacion_id"]
            isOneToOne: false
            referencedRelation: "capacitaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asistencia_capacitacion_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asistencia_capacitacion_trabajador_id_fkey"
            columns: ["trabajador_id"]
            isOneToOne: false
            referencedRelation: "trabajadores"
            referencedColumns: ["id"]
          },
        ]
      }
      ausencias: {
        Row: {
          created_at: string
          dias: number | null
          empresa_id: string
          estado: string
          fecha_fin: string | null
          fecha_inicio: string
          id: string
          motivo: string | null
          soporte_url: string | null
          tipo: string
          trabajador_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dias?: number | null
          empresa_id: string
          estado?: string
          fecha_fin?: string | null
          fecha_inicio: string
          id?: string
          motivo?: string | null
          soporte_url?: string | null
          tipo: string
          trabajador_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dias?: number | null
          empresa_id?: string
          estado?: string
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: string
          motivo?: string | null
          soporte_url?: string | null
          tipo?: string
          trabajador_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ausencias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ausencias_trabajador_id_fkey"
            columns: ["trabajador_id"]
            isOneToOne: false
            referencedRelation: "trabajadores"
            referencedColumns: ["id"]
          },
        ]
      }
      capacitaciones: {
        Row: {
          created_at: string
          descripcion: string | null
          duracion_horas: number | null
          empresa_id: string
          estado: string
          fecha: string
          id: string
          responsable: string | null
          tipo: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          duracion_horas?: number | null
          empresa_id: string
          estado?: string
          fecha: string
          id?: string
          responsable?: string | null
          tipo?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          duracion_horas?: number | null
          empresa_id?: string
          estado?: string
          fecha?: string
          id?: string
          responsable?: string | null
          tipo?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capacitaciones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      carpetas_sgsst: {
        Row: {
          created_at: string
          descripcion: string | null
          empresa_id: string
          id: string
          nombre: string
          orden: number | null
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          empresa_id: string
          id?: string
          nombre: string
          orden?: number | null
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          empresa_id?: string
          id?: string
          nombre?: string
          orden?: number | null
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "carpetas_sgsst_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carpetas_sgsst_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "carpetas_sgsst"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes_portal: {
        Row: {
          activo: boolean
          contacto: string | null
          created_at: string
          email: string | null
          empresa_id: string
          id: string
          nit_cedula: string
          nombre: string
          notas: string | null
          telefono: string | null
          tipo: string
          token_acceso: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          contacto?: string | null
          created_at?: string
          email?: string | null
          empresa_id: string
          id?: string
          nit_cedula: string
          nombre: string
          notas?: string | null
          telefono?: string | null
          tipo?: string
          token_acceso?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          contacto?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: string
          id?: string
          nit_cedula?: string
          nombre?: string
          notas?: string | null
          telefono?: string | null
          tipo?: string
          token_acceso?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_portal_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      contratistas: {
        Row: {
          contacto: string | null
          created_at: string
          email: string | null
          empresa_id: string
          estado: string
          id: string
          nit: string | null
          nombre: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          contacto?: string | null
          created_at?: string
          email?: string | null
          empresa_id: string
          estado?: string
          id?: string
          nit?: string | null
          nombre: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          contacto?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: string
          estado?: string
          id?: string
          nit?: string | null
          nombre?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contratistas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      docs_empresa_cliente: {
        Row: {
          cliente_id: string
          created_at: string
          documento_id: string
          empresa_id: string
          id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          documento_id: string
          empresa_id: string
          id?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          documento_id?: string
          empresa_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "docs_empresa_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_portal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "docs_empresa_cliente_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "docs_empresa_cliente_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      docs_estandar: {
        Row: {
          created_at: string
          doc_nombre: string | null
          doc_subido_en: string | null
          doc_url: string | null
          empresa_id: string
          estado: string
          estandar_id: string
          id: string
          plantilla_nombre: string | null
          plantilla_subido_en: string | null
          plantilla_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          doc_nombre?: string | null
          doc_subido_en?: string | null
          doc_url?: string | null
          empresa_id: string
          estado?: string
          estandar_id: string
          id?: string
          plantilla_nombre?: string | null
          plantilla_subido_en?: string | null
          plantilla_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          doc_nombre?: string | null
          doc_subido_en?: string | null
          doc_url?: string | null
          empresa_id?: string
          estado?: string
          estandar_id?: string
          id?: string
          plantilla_nombre?: string | null
          plantilla_subido_en?: string | null
          plantilla_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "docs_estandar_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "docs_estandar_estandar_id_fkey"
            columns: ["estandar_id"]
            isOneToOne: false
            referencedRelation: "phva_estandares"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_empresa: {
        Row: {
          created_at: string
          empresa_id: string
          estado: string
          fecha_vencimiento: string | null
          id: string
          nombre: string
          tiene_vencimiento: boolean
          tipo: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          empresa_id: string
          estado?: string
          fecha_vencimiento?: string | null
          id?: string
          nombre: string
          tiene_vencimiento?: boolean
          tipo?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          empresa_id?: string
          estado?: string
          fecha_vencimiento?: string | null
          id?: string
          nombre?: string
          tiene_vencimiento?: boolean
          tipo?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_sgsst: {
        Row: {
          carpeta_id: string | null
          created_at: string
          empresa_id: string
          estado: string
          fecha_vencimiento: string | null
          id: string
          nombre: string
          tiene_vencimiento: boolean
          tipo: string | null
          updated_at: string
          url: string | null
          version: number | null
        }
        Insert: {
          carpeta_id?: string | null
          created_at?: string
          empresa_id: string
          estado?: string
          fecha_vencimiento?: string | null
          id?: string
          nombre: string
          tiene_vencimiento?: boolean
          tipo?: string | null
          updated_at?: string
          url?: string | null
          version?: number | null
        }
        Update: {
          carpeta_id?: string | null
          created_at?: string
          empresa_id?: string
          estado?: string
          fecha_vencimiento?: string | null
          id?: string
          nombre?: string
          tiene_vencimiento?: boolean
          tipo?: string | null
          updated_at?: string
          url?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_sgsst_carpeta_id_fkey"
            columns: ["carpeta_id"]
            isOneToOne: false
            referencedRelation: "carpetas_sgsst"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_sgsst_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_trabajador: {
        Row: {
          created_at: string
          empresa_id: string
          estado: string
          fecha_vencimiento: string | null
          id: string
          nombre: string
          tipo: string | null
          trabajador_id: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          empresa_id: string
          estado?: string
          fecha_vencimiento?: string | null
          id?: string
          nombre: string
          tipo?: string | null
          trabajador_id: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          empresa_id?: string
          estado?: string
          fecha_vencimiento?: string | null
          id?: string
          nombre?: string
          tipo?: string | null
          trabajador_id?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_trabajador_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_trabajador_trabajador_id_fkey"
            columns: ["trabajador_id"]
            isOneToOne: false
            referencedRelation: "trabajadores"
            referencedColumns: ["id"]
          },
        ]
      }
      empleados_contratista: {
        Row: {
          apellidos: string
          cargo: string | null
          contratista_id: string
          created_at: string
          empresa_id: string
          estado: string
          id: string
          nombres: string
          numero_documento: string
          tipo_documento: string
          updated_at: string
        }
        Insert: {
          apellidos: string
          cargo?: string | null
          contratista_id: string
          created_at?: string
          empresa_id: string
          estado?: string
          id?: string
          nombres: string
          numero_documento: string
          tipo_documento?: string
          updated_at?: string
        }
        Update: {
          apellidos?: string
          cargo?: string | null
          contratista_id?: string
          created_at?: string
          empresa_id?: string
          estado?: string
          id?: string
          nombres?: string
          numero_documento?: string
          tipo_documento?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empleados_contratista_contratista_id_fkey"
            columns: ["contratista_id"]
            isOneToOne: false
            referencedRelation: "contratistas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleados_contratista_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_estandares: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          nivel: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          nivel?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          nivel?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresa_estandares_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          actividad_economica: string | null
          arl: string | null
          ciudad: string | null
          clase_riesgo: string | null
          created_at: string
          departamento: string | null
          direccion: string | null
          email: string | null
          id: string
          limite_trabajadores: number | null
          logo_url: string | null
          nit: string | null
          nivel_proteccion: string | null
          nombre: string
          num_empleados_directos: number | null
          num_empleados_indirectos: number | null
          plan: string | null
          representante_legal: string | null
          responsable_sgsst: string | null
          sector_industria: string | null
          telefono: string | null
          tiene_contratistas: boolean | null
          updated_at: string
        }
        Insert: {
          actividad_economica?: string | null
          arl?: string | null
          ciudad?: string | null
          clase_riesgo?: string | null
          created_at?: string
          departamento?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          limite_trabajadores?: number | null
          logo_url?: string | null
          nit?: string | null
          nivel_proteccion?: string | null
          nombre: string
          num_empleados_directos?: number | null
          num_empleados_indirectos?: number | null
          plan?: string | null
          representante_legal?: string | null
          responsable_sgsst?: string | null
          sector_industria?: string | null
          telefono?: string | null
          tiene_contratistas?: boolean | null
          updated_at?: string
        }
        Update: {
          actividad_economica?: string | null
          arl?: string | null
          ciudad?: string | null
          clase_riesgo?: string | null
          created_at?: string
          departamento?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          limite_trabajadores?: number | null
          logo_url?: string | null
          nit?: string | null
          nivel_proteccion?: string | null
          nombre?: string
          num_empleados_directos?: number | null
          num_empleados_indirectos?: number | null
          plan?: string | null
          representante_legal?: string | null
          responsable_sgsst?: string | null
          sector_industria?: string | null
          telefono?: string | null
          tiene_contratistas?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      examenes_medicos: {
        Row: {
          concepto: string | null
          created_at: string
          empresa_id: string
          fecha: string
          id: string
          proximo_control: string | null
          restricciones: string | null
          resultado: string | null
          soporte_url: string | null
          tipo: string
          trabajador_id: string
          updated_at: string
        }
        Insert: {
          concepto?: string | null
          created_at?: string
          empresa_id: string
          fecha: string
          id?: string
          proximo_control?: string | null
          restricciones?: string | null
          resultado?: string | null
          soporte_url?: string | null
          tipo: string
          trabajador_id: string
          updated_at?: string
        }
        Update: {
          concepto?: string | null
          created_at?: string
          empresa_id?: string
          fecha?: string
          id?: string
          proximo_control?: string | null
          restricciones?: string | null
          resultado?: string | null
          soporte_url?: string | null
          tipo?: string
          trabajador_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "examenes_medicos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "examenes_medicos_trabajador_id_fkey"
            columns: ["trabajador_id"]
            isOneToOne: false
            referencedRelation: "trabajadores"
            referencedColumns: ["id"]
          },
        ]
      }
      firmas_documentos: {
        Row: {
          created_at: string
          documento_id: string
          documento_tipo: string
          empresa_id: string
          estado: string
          firma_url: string | null
          firmado_en: string | null
          firmante_id: string | null
          firmante_nombre: string | null
          id: string
        }
        Insert: {
          created_at?: string
          documento_id: string
          documento_tipo: string
          empresa_id: string
          estado?: string
          firma_url?: string | null
          firmado_en?: string | null
          firmante_id?: string | null
          firmante_nombre?: string | null
          id?: string
        }
        Update: {
          created_at?: string
          documento_id?: string
          documento_tipo?: string
          empresa_id?: string
          estado?: string
          firma_url?: string | null
          firmado_en?: string | null
          firmante_id?: string | null
          firmante_nombre?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "firmas_documentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      inspeccion_elementos: {
        Row: {
          activo_id: string | null
          campos_libres: Json | null
          checklist: Json | null
          created_at: string | null
          empresa_id: string
          foto_urls: Json | null
          id: string
          identificador: string
          inspeccion_id: string | null
          numero: number | null
          observaciones: string | null
          subtipo: string | null
        }
        Insert: {
          activo_id?: string | null
          campos_libres?: Json | null
          checklist?: Json | null
          created_at?: string | null
          empresa_id: string
          foto_urls?: Json | null
          id?: string
          identificador: string
          inspeccion_id?: string | null
          numero?: number | null
          observaciones?: string | null
          subtipo?: string | null
        }
        Update: {
          activo_id?: string | null
          campos_libres?: Json | null
          checklist?: Json | null
          created_at?: string | null
          empresa_id?: string
          foto_urls?: Json | null
          id?: string
          identificador?: string
          inspeccion_id?: string | null
          numero?: number | null
          observaciones?: string | null
          subtipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspeccion_elementos_activo_id_fkey"
            columns: ["activo_id"]
            isOneToOne: false
            referencedRelation: "activos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspeccion_elementos_inspeccion_id_fkey"
            columns: ["inspeccion_id"]
            isOneToOne: false
            referencedRelation: "inspecciones"
            referencedColumns: ["id"]
          },
        ]
      }
      inspecciones: {
        Row: {
          asociado_id: string | null
          asociado_nombre: string | null
          asociado_tipo: string | null
          codigo: string | null
          created_at: string | null
          empresa_id: string
          estado: string | null
          fecha: string
          id: string
          observaciones_generales: string | null
          responsable: string | null
          responsable_id: string | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          asociado_id?: string | null
          asociado_nombre?: string | null
          asociado_tipo?: string | null
          codigo?: string | null
          created_at?: string | null
          empresa_id: string
          estado?: string | null
          fecha?: string
          id?: string
          observaciones_generales?: string | null
          responsable?: string | null
          responsable_id?: string | null
          tipo: string
          updated_at?: string | null
        }
        Update: {
          asociado_id?: string | null
          asociado_nombre?: string | null
          asociado_tipo?: string | null
          codigo?: string | null
          created_at?: string | null
          empresa_id?: string
          estado?: string | null
          fecha?: string
          id?: string
          observaciones_generales?: string | null
          responsable?: string | null
          responsable_id?: string | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      invitaciones: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          created_by: string | null
          email: string
          empresa_id: string
          estado: string
          id: string
          rol: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          created_by?: string | null
          email: string
          empresa_id: string
          estado?: string
          id?: string
          rol?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string
          empresa_id?: string
          estado?: string
          id?: string
          rol?: string
          token?: string
        }
        Relationships: []
      }
      items_plan_mejora: {
        Row: {
          created_at: string
          descripcion: string
          empresa_id: string
          estado: string
          evidencia_url: string | null
          fecha_limite: string | null
          id: string
          plan_id: string
          responsable: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion: string
          empresa_id: string
          estado?: string
          evidencia_url?: string | null
          fecha_limite?: string | null
          id?: string
          plan_id: string
          responsable?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string
          empresa_id?: string
          estado?: string
          evidencia_url?: string | null
          fecha_limite?: string | null
          id?: string
          plan_id?: string
          responsable?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_plan_mejora_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_plan_mejora_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plan_mejora"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos: {
        Row: {
          concepto: string | null
          created_at: string
          empresa_id: string
          estado: string
          fecha_pago: string | null
          id: string
          metodo_pago: string | null
          moneda: string | null
          monto: number
          referencia: string | null
          updated_at: string
        }
        Insert: {
          concepto?: string | null
          created_at?: string
          empresa_id: string
          estado?: string
          fecha_pago?: string | null
          id?: string
          metodo_pago?: string | null
          moneda?: string | null
          monto: number
          referencia?: string | null
          updated_at?: string
        }
        Update: {
          concepto?: string | null
          created_at?: string
          empresa_id?: string
          estado?: string
          fecha_pago?: string | null
          id?: string
          metodo_pago?: string | null
          moneda?: string | null
          monto?: number
          referencia?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      perfil_sociodemografico: {
        Row: {
          created_at: string
          empresa_id: string
          estado_civil: string | null
          estrato: number | null
          id: string
          medio_transporte: string | null
          nivel_educativo: string | null
          num_hijos: number | null
          tipo_vivienda: string | null
          trabajador_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          estado_civil?: string | null
          estrato?: number | null
          id?: string
          medio_transporte?: string | null
          nivel_educativo?: string | null
          num_hijos?: number | null
          tipo_vivienda?: string | null
          trabajador_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          estado_civil?: string | null
          estrato?: number | null
          id?: string
          medio_transporte?: string | null
          nivel_educativo?: string | null
          num_hijos?: number | null
          tipo_vivienda?: string | null
          trabajador_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfil_sociodemografico_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perfil_sociodemografico_trabajador_id_fkey"
            columns: ["trabajador_id"]
            isOneToOne: false
            referencedRelation: "trabajadores"
            referencedColumns: ["id"]
          },
        ]
      }
      phva_estandares: {
        Row: {
          aplica_21: boolean
          aplica_60: boolean
          aplica_7: boolean
          codigo: string
          created_at: string
          fase: string
          grupo: string
          id: string
          nombre: string
          orden: number
          puntaje: number
        }
        Insert: {
          aplica_21?: boolean
          aplica_60?: boolean
          aplica_7?: boolean
          codigo: string
          created_at?: string
          fase: string
          grupo: string
          id?: string
          nombre: string
          orden?: number
          puntaje?: number
        }
        Update: {
          aplica_21?: boolean
          aplica_60?: boolean
          aplica_7?: boolean
          codigo?: string
          created_at?: string
          fase?: string
          grupo?: string
          id?: string
          nombre?: string
          orden?: number
          puntaje?: number
        }
        Relationships: []
      }
      plan_anual: {
        Row: {
          anio: number
          aprobado_por: string | null
          created_at: string
          empresa_id: string
          estado: string
          id: string
          objetivo: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          anio: number
          aprobado_por?: string | null
          created_at?: string
          empresa_id: string
          estado?: string
          id?: string
          objetivo?: string | null
          titulo?: string
          updated_at?: string
        }
        Update: {
          anio?: number
          aprobado_por?: string | null
          created_at?: string
          empresa_id?: string
          estado?: string
          id?: string
          objetivo?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_anual_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_mejora: {
        Row: {
          created_at: string
          descripcion: string | null
          empresa_id: string
          estado: string
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          responsable: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          empresa_id: string
          estado?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          responsable?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          empresa_id?: string
          estado?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          responsable?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_mejora_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      proveedores: {
        Row: {
          arl: string | null
          ciudad: string | null
          created_at: string | null
          departamento: string | null
          email: string | null
          empresa_id: string
          empresa_proveedor_id: string | null
          estado: string | null
          fecha_fin_contrato: string | null
          fecha_inicio_contrato: string | null
          id: string
          invite_token: string | null
          nit: string | null
          nombre: string
          notas: string | null
          representante: string | null
          telefono: string | null
          tipo_servicio: string | null
          updated_at: string | null
        }
        Insert: {
          arl?: string | null
          ciudad?: string | null
          created_at?: string | null
          departamento?: string | null
          email?: string | null
          empresa_id: string
          empresa_proveedor_id?: string | null
          estado?: string | null
          fecha_fin_contrato?: string | null
          fecha_inicio_contrato?: string | null
          id?: string
          invite_token?: string | null
          nit?: string | null
          nombre: string
          notas?: string | null
          representante?: string | null
          telefono?: string | null
          tipo_servicio?: string | null
          updated_at?: string | null
        }
        Update: {
          arl?: string | null
          ciudad?: string | null
          created_at?: string | null
          departamento?: string | null
          email?: string | null
          empresa_id?: string
          empresa_proveedor_id?: string | null
          estado?: string | null
          fecha_fin_contrato?: string | null
          fecha_inicio_contrato?: string | null
          id?: string
          invite_token?: string | null
          nit?: string | null
          nombre?: string
          notas?: string | null
          representante?: string | null
          telefono?: string | null
          tipo_servicio?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proveedores_empresa_proveedor_id_fkey"
            columns: ["empresa_proveedor_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      sedes: {
        Row: {
          ciudad: string | null
          created_at: string
          departamento: string | null
          direccion: string | null
          empresa_id: string
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          ciudad?: string | null
          created_at?: string
          departamento?: string | null
          direccion?: string | null
          empresa_id: string
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          ciudad?: string | null
          created_at?: string
          departamento?: string | null
          direccion?: string | null
          empresa_id?: string
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sedes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitudes_enlace: {
        Row: {
          created_at: string | null
          empresa_proveedor_id: string
          empresa_solicitante_id: string
          estado: string
          id: string
          mensaje: string | null
          proveedor_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          empresa_proveedor_id: string
          empresa_solicitante_id: string
          estado?: string
          id?: string
          mensaje?: string | null
          proveedor_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          empresa_proveedor_id?: string
          empresa_solicitante_id?: string
          estado?: string
          id?: string
          mensaje?: string | null
          proveedor_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_enlace_empresa_proveedor_id_fkey"
            columns: ["empresa_proveedor_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_enlace_empresa_solicitante_id_fkey"
            columns: ["empresa_solicitante_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_enlace_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      tareas: {
        Row: {
          created_at: string
          descripcion: string | null
          empresa_id: string
          estado: string
          fecha: string
          fecha_fin: string | null
          id: string
          prioridad: string
          responsable: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          empresa_id: string
          estado?: string
          fecha: string
          fecha_fin?: string | null
          id?: string
          prioridad?: string
          responsable?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          empresa_id?: string
          estado?: string
          fecha?: string
          fecha_fin?: string | null
          id?: string
          prioridad?: string
          responsable?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tareas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      trabajadores: {
        Row: {
          apellidos: string
          arl: string | null
          caja_compensacion: string | null
          cargo: string | null
          celular_contacto_emergencia: string | null
          ciudad: string | null
          ciudad_residencia: string | null
          created_at: string
          departamento: string | null
          departamento_residencia: string | null
          direccion: string | null
          eliminado: boolean | null
          eliminado_en: string | null
          email: string | null
          empresa_contratista: string | null
          empresa_id: string
          eps: string | null
          estado: string
          fecha_fin_contrato: string | null
          fecha_ingreso: string | null
          fecha_nacimiento: string | null
          genero: string | null
          id: string
          nombre_contacto_emergencia: string | null
          nombres: string
          numero_documento: string
          pais: string | null
          parentesco_contacto_emergencia: string | null
          pension: string | null
          perfil_sociodemografico: Json | null
          rh: string | null
          sede: string | null
          telefono: string | null
          tipo_contrato: string | null
          tipo_documento: string
          tipo_trabajador: string | null
          updated_at: string
          verificado_en: string | null
          verificado_ingreso: boolean
          verificado_por: string | null
        }
        Insert: {
          apellidos: string
          arl?: string | null
          caja_compensacion?: string | null
          cargo?: string | null
          celular_contacto_emergencia?: string | null
          ciudad?: string | null
          ciudad_residencia?: string | null
          created_at?: string
          departamento?: string | null
          departamento_residencia?: string | null
          direccion?: string | null
          eliminado?: boolean | null
          eliminado_en?: string | null
          email?: string | null
          empresa_contratista?: string | null
          empresa_id: string
          eps?: string | null
          estado?: string
          fecha_fin_contrato?: string | null
          fecha_ingreso?: string | null
          fecha_nacimiento?: string | null
          genero?: string | null
          id?: string
          nombre_contacto_emergencia?: string | null
          nombres: string
          numero_documento: string
          pais?: string | null
          parentesco_contacto_emergencia?: string | null
          pension?: string | null
          perfil_sociodemografico?: Json | null
          rh?: string | null
          sede?: string | null
          telefono?: string | null
          tipo_contrato?: string | null
          tipo_documento?: string
          tipo_trabajador?: string | null
          updated_at?: string
          verificado_en?: string | null
          verificado_ingreso?: boolean
          verificado_por?: string | null
        }
        Update: {
          apellidos?: string
          arl?: string | null
          caja_compensacion?: string | null
          cargo?: string | null
          celular_contacto_emergencia?: string | null
          ciudad?: string | null
          ciudad_residencia?: string | null
          created_at?: string
          departamento?: string | null
          departamento_residencia?: string | null
          direccion?: string | null
          eliminado?: boolean | null
          eliminado_en?: string | null
          email?: string | null
          empresa_contratista?: string | null
          empresa_id?: string
          eps?: string | null
          estado?: string
          fecha_fin_contrato?: string | null
          fecha_ingreso?: string | null
          fecha_nacimiento?: string | null
          genero?: string | null
          id?: string
          nombre_contacto_emergencia?: string | null
          nombres?: string
          numero_documento?: string
          pais?: string | null
          parentesco_contacto_emergencia?: string | null
          pension?: string | null
          perfil_sociodemografico?: Json | null
          rh?: string | null
          sede?: string | null
          telefono?: string | null
          tipo_contrato?: string | null
          tipo_documento?: string
          tipo_trabajador?: string | null
          updated_at?: string
          verificado_en?: string | null
          verificado_ingreso?: boolean
          verificado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trabajadores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      trabajadores_cliente: {
        Row: {
          activo: boolean
          cliente_id: string
          created_at: string
          empresa_id: string
          id: string
          trabajador_id: string
        }
        Insert: {
          activo?: boolean
          cliente_id: string
          created_at?: string
          empresa_id: string
          id?: string
          trabajador_id: string
        }
        Update: {
          activo?: boolean
          cliente_id?: string
          created_at?: string
          empresa_id?: string
          id?: string
          trabajador_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trabajadores_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_portal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trabajadores_cliente_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trabajadores_cliente_trabajador_id_fkey"
            columns: ["trabajador_id"]
            isOneToOne: false
            referencedRelation: "trabajadores"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          apellido: string | null
          auth_user_id: string
          avatar_url: string | null
          cargo: string | null
          created_at: string
          email: string
          empresa_id: string | null
          id: string
          nombre: string
          nombre_completo: string
          rol: string
          updated_at: string
          user_id: string
        }
        Insert: {
          apellido?: string | null
          auth_user_id: string
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          email: string
          empresa_id?: string | null
          id?: string
          nombre: string
          nombre_completo: string
          rol?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          apellido?: string | null
          auth_user_id?: string
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          email?: string
          empresa_id?: string | null
          id?: string
          nombre?: string
          nombre_completo?: string
          rol?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      verificacion_audit: {
        Row: {
          cambiado_en: string
          cambiado_por: string | null
          cambiado_por_nombre: string | null
          empresa_id: string
          id: string
          trabajador_id: string
          valor_anterior: boolean | null
          valor_nuevo: boolean
        }
        Insert: {
          cambiado_en?: string
          cambiado_por?: string | null
          cambiado_por_nombre?: string | null
          empresa_id: string
          id?: string
          trabajador_id: string
          valor_anterior?: boolean | null
          valor_nuevo: boolean
        }
        Update: {
          cambiado_en?: string
          cambiado_por?: string | null
          cambiado_por_nombre?: string | null
          empresa_id?: string
          id?: string
          trabajador_id?: string
          valor_anterior?: boolean | null
          valor_nuevo?: boolean
        }
        Relationships: []
      }
      whatsapp_log: {
        Row: {
          created_at: string
          empresa_id: string
          estado: string
          id: string
          mensaje: string
          telefono: string
          tipo: string | null
          trabajador_id: string | null
        }
        Insert: {
          created_at?: string
          empresa_id: string
          estado?: string
          id?: string
          mensaje: string
          telefono: string
          tipo?: string | null
          trabajador_id?: string | null
        }
        Update: {
          created_at?: string
          empresa_id?: string
          estado?: string
          id?: string
          mensaje?: string
          telefono?: string
          tipo?: string | null
          trabajador_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_log_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_log_trabajador_id_fkey"
            columns: ["trabajador_id"]
            isOneToOne: false
            referencedRelation: "trabajadores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_assign_initial_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      can_create_empresa: { Args: { _user_id: string }; Returns: boolean }
      find_empresa_by_nit: {
        Args: { p_nit: string }
        Returns: {
          id: string
          nombre: string
        }[]
      }
      get_cumplimiento_phva: { Args: { p_empresa_id: string }; Returns: Json }
      get_portal_cliente:
        | { Args: { p_empresa_id: string; p_nit: string }; Returns: Json }
        | { Args: { p_nit_cedula: string }; Returns: Json }
      get_user_empresa_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      normalize_nit: { Args: { p_nit: string }; Returns: string }
    }
    Enums: {
      app_role: "administrador" | "asistente" | "lector" | "super_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["administrador", "asistente", "lector", "super_admin"],
    },
  },
} as const
