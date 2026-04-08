import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Loader2, CalendarDays, BarChart2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

const MESES_LABEL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// Devuelve las fechas del mes que coincidan con los días configurados
function getDiasDelMes(anio, mes, dias1x, dias2x) {
  const dias1Set = new Set(dias1x)
  const dias2Set = new Set(dias2x)
  const soloEn2  = new Set([...dias2x].filter(d => !dias1Set.has(d)))

  const fechas1x = []
  const fechas2x = [] // días exclusivos de 2x (no en 1x)
  const todos    = []

  const fecha = new Date(anio, mes - 1, 1)
  while (fecha.getMonth() === mes - 1) {
    const str = fecha.toISOString().split('T')[0]
    const dow = fecha.getDay()
    if (dias1Set.has(dow)) { fechas1x.push(str); todos.push(str) }
    else if (soloEn2.has(dow)) { fechas2x.push(str); todos.push(str) }
    fecha.setDate(fecha.getDate() + 1)
  }
  todos.sort()
  return { fechas1x, fechas2x, todos }
}

const DIAS_CORTO = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

function diaLabel(fechaStr) {
  const d  = new Date(fechaStr + 'T12:00:00')
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return { texto: `${dd}/${mm}`, tipo: DIAS_CORTO[d.getDay()] }
}

// ─── TAB: Registro diario ────────────────────────────────────────────────────
function Registro({ dias1x, dias2x, horarios }) {
  const [filtroHorarioId, setFiltroHorarioId] = useState('')
  const [fecha, setFecha]           = useState(new Date().toISOString().split('T')[0])
  const [alumnos, setAlumnos]       = useState([])
  const [asistencia, setAsistencia] = useState({})
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(null)

  useEffect(() => { fetchData() }, [fecha])

  const fetchData = async () => {
    setLoading(true)
    const [{ data: alumnosData }, { data: asistenciaData }] = await Promise.all([
      supabase.from('alumnos').select('id, nombre_completo, nivel, frecuencia, horario_id').eq('estado', 'activo').order('nombre_completo'),
      supabase.from('asistencia').select('alumno_id, presente').eq('fecha', fecha),
    ])
    const mapa = {}
    ;(asistenciaData ?? []).forEach(a => { mapa[a.alumno_id] = a.presente })
    setAlumnos(alumnosData ?? [])
    setAsistencia(mapa)
    setLoading(false)
  }

  const toggle = async (alumnoId, presente) => {
    setSaving(alumnoId)
    const { data: existing } = await supabase
      .from('asistencia').select('id').eq('alumno_id', alumnoId).eq('fecha', fecha).maybeSingle()
    if (existing) {
      await supabase.from('asistencia').update({ presente }).eq('id', existing.id)
    } else {
      await supabase.from('asistencia').insert({ alumno_id: alumnoId, fecha, presente })
    }
    setAsistencia(prev => ({ ...prev, [alumnoId]: presente }))
    setSaving(null)
  }

  const diaSemana = new Date(fecha + 'T12:00:00').getDay()
  const dias1Set  = new Set(dias1x)
  const dias2Set  = new Set(dias2x)
  const soloEn2   = new Set([...dias2x].filter(d => !dias1Set.has(d)))

  const esDia1x   = dias1Set.has(diaSemana)   // todos entrenan
  const esDia2x   = soloEn2.has(diaSemana)    // solo 2x/sem
  const esDiaEntrenamiento = esDia1x || esDia2x

  // Filtrar alumnos según el día
  const alumnosFiltrados = esDia2x
    ? alumnos.filter(a => a.frecuencia === 2)
    : alumnos

  const alumnosFiltradosPorGrupo = filtroHorarioId
    ? alumnosFiltrados.filter(a => a.horario_id === filtroHorarioId)
    : alumnosFiltrados

  const presentes = alumnosFiltradosPorGrupo.filter(a => asistencia[a.id] === true).length

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {horarios.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFiltroHorarioId('')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                !filtroHorarioId
                  ? 'bg-primary-800 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todos
            </button>
            {horarios.map(h => (
              <button
                key={h.id}
                onClick={() => setFiltroHorarioId(h.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  filtroHorarioId === h.id
                    ? (h.nombre === 'Grupo A' ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white')
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {h.nombre} · {h.hora_inicio.slice(0, 5)}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <CalendarDays size={18} className="text-gray-400" />
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {esDia1x && (
          <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
            {DIAS_CORTO[diaSemana]} — entrenan todos los alumnos
          </span>
        )}
        {esDia2x && (
          <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg">
            {DIAS_CORTO[diaSemana]} — entrenan alumnos de 2 veces/semana
          </span>
        )}
        {!esDiaEntrenamiento && (
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
            No es día de entrenamiento
          </span>
        )}

        <span className="text-sm text-gray-500 sm:ml-auto">
          {presentes} / {alumnosFiltradosPorGrupo.length} presentes
        </span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-primary-600" /></div>
        ) : alumnosFiltradosPorGrupo.length === 0 ? (
          <p className="text-center text-gray-400 py-16 text-sm">No hay alumnos que entrenen este día.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {alumnosFiltradosPorGrupo.map(a => {
              const presente = asistencia[a.id]
              const isSaving = saving === a.id
              return (
                <li key={a.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">{a.nombre_completo}</p>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">
                      {a.nivel} · {a.frecuencia === 1 ? 'Sábados' : 'Martes y sábados'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSaving ? (
                      <Loader2 size={20} className="animate-spin text-gray-400" />
                    ) : (
                      <>
                        <button
                          onClick={() => toggle(a.id, true)}
                          title="Presente"
                          className={`p-1.5 rounded-lg transition ${presente === true ? 'text-green-600 bg-green-100' : 'text-gray-300 hover:text-green-500 hover:bg-green-50'}`}
                        >
                          <CheckCircle size={22} />
                        </button>
                        <button
                          onClick={() => toggle(a.id, false)}
                          title="Ausente"
                          className={`p-1.5 rounded-lg transition ${presente === false ? 'text-red-500 bg-red-100' : 'text-gray-300 hover:text-red-400 hover:bg-red-50'}`}
                        >
                          <XCircle size={22} />
                        </button>
                      </>
                    )}
                    <span className={`text-xs font-medium ml-1 w-16 text-right ${
                      presente === true ? 'text-green-600' : presente === false ? 'text-red-500' : 'text-gray-400'
                    }`}>
                      {presente === true ? 'Presente' : presente === false ? 'Ausente' : 'Sin marcar'}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

// ─── TAB: Reporte mensual ────────────────────────────────────────────────────
function Reporte({ dias1x, dias2x }) {
  const hoy = new Date()
  const [mes, setMes]     = useState(hoy.getMonth() + 1)
  const [anio, setAnio]   = useState(hoy.getFullYear())
  const [filas, setFilas] = useState([])
  const [dias, setDias]   = useState({ fechas1x: [], fechas2x: [], todos: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (dias1x.length || dias2x.length) fetchReporte() }, [mes, anio, dias1x, dias2x])

  const fetchReporte = async () => {
    setLoading(true)

    const diasMes = getDiasDelMes(anio, mes, dias1x, dias2x)
    setDias(diasMes)

    const [{ data: alumnosData }, { data: asistenciaData }] = await Promise.all([
      supabase.from('alumnos').select('id, nombre_completo, nivel, frecuencia, horario_id').eq('estado', 'activo').order('nombre_completo'),
      supabase.from('asistencia')
        .select('alumno_id, fecha, presente')
        .in('fecha', diasMes.todos.length > 0 ? diasMes.todos : ['1900-01-01']),
    ])

    const asistenciaMapa = {}
    ;(asistenciaData ?? []).forEach(r => {
      if (!asistenciaMapa[r.alumno_id]) asistenciaMapa[r.alumno_id] = {}
      asistenciaMapa[r.alumno_id][r.fecha] = r.presente
    })

    const resultado = (alumnosData ?? []).map(a => {
      const registros  = asistenciaMapa[a.id] ?? {}
      // 1x: solo dias comunes; 2x: todos los días
      const diasAlumno = a.frecuencia === 2 ? diasMes.todos : diasMes.fechas1x
      const presentes  = diasAlumno.filter(d => registros[d] === true).length
      const total      = diasAlumno.length
      const porcentaje = total > 0 ? Math.round((presentes / total) * 100) : null
      return { ...a, presentes, total, porcentaje, registros, diasAlumno }
    })

    setFilas(resultado)
    setLoading(false)
  }

  const porcentajeColor = (p) => {
    if (p === null) return 'text-gray-400'
    if (p >= 80)   return 'text-green-600'
    if (p >= 50)   return 'text-yellow-600'
    return 'text-red-500'
  }

  const barColor = (p) => {
    if (!p) return 'bg-gray-200'
    if (p >= 80) return 'bg-green-500'
    if (p >= 50) return 'bg-yellow-500'
    return 'bg-red-400'
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={mes}
          onChange={e => setMes(parseInt(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {MESES_LABEL.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <input
          type="number"
          value={anio}
          onChange={e => setAnio(parseInt(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <div className="flex gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary-700 inline-block" />
            {dias.fechas1x.length} día{dias.fechas1x.length !== 1 ? 's' : ''} (todos)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
            {dias.fechas2x.length} día{dias.fechas2x.length !== 1 ? 's' : ''} (solo 2×/sem)
          </span>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 rounded bg-primary-100 text-primary-700 font-medium">Todos</span> Día común (1× y 2×/sem)</span>
        <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">2×</span> Solo 2 veces/semana</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-primary-600" /></div>
        ) : filas.length === 0 ? (
          <p className="text-center text-gray-400 py-16 text-sm">No hay alumnos activos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-primary-950 text-primary-200 text-left">
                <tr>
                  <th className="px-6 py-3 font-medium">Alumno</th>
                  <th className="px-6 py-3 font-medium">Nivel</th>
                  <th className="px-6 py-3 font-medium text-center">Asistencias</th>
                  <th className="px-6 py-3 font-medium min-w-[100px]">Progreso</th>
                  <th className="px-6 py-3 font-medium text-center">%</th>
                  {dias.todos.map(d => {
                    const { texto, tipo } = diaLabel(d)
                    const es2x = dias.fechas2x.includes(d)
                    return (
                      <th key={d} className="px-2 py-3 font-medium text-center text-xs">
                        <div className={`px-1.5 py-0.5 rounded text-xs font-semibold ${es2x ? 'bg-blue-800 text-blue-200' : 'bg-primary-800 text-primary-200'}`}>
                          {tipo}
                        </div>
                        <div className="mt-0.5 text-primary-300">{texto}</div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filas.map(f => (
                  <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-800">{f.nombre_completo}</td>
                    <td className="px-6 py-4 capitalize text-gray-500 text-xs">{f.nivel}</td>
                    <td className="px-6 py-4 text-center text-gray-700">{f.presentes} / {f.total}</td>
                    <td className="px-6 py-4">
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${barColor(f.porcentaje)}`}
                          style={{ width: `${f.porcentaje ?? 0}%` }}
                        />
                      </div>
                    </td>
                    <td className={`px-6 py-4 text-center font-semibold ${porcentajeColor(f.porcentaje)}`}>
                      {f.porcentaje !== null ? `${f.porcentaje}%` : '—'}
                    </td>
                    {dias.todos.map(d => {
                      const entrena = f.diasAlumno.includes(d)
                      const v       = f.registros[d]
                      if (!entrena) {
                        return <td key={d} className="px-2 py-4 text-center bg-gray-50"><span className="text-gray-200">—</span></td>
                      }
                      return (
                        <td key={d} className="px-2 py-4 text-center">
                          {v === true  && <span className="text-green-500 text-base">✓</span>}
                          {v === false && <span className="text-red-400 text-base">✗</span>}
                          {v === undefined && <span className="text-gray-300 text-base">·</span>}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────
export default function Asistencia() {
  const [tab, setTab]           = useState('registro')
  const [dias1x, setDias1x]     = useState([6])
  const [dias2x, setDias2x]     = useState([2, 6])
  const [horarios, setHorarios] = useState([])
  const [configLoaded, setConfigLoaded] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('configuracion').select('clave, valor')
        .in('clave', ['dias_1_vez_semana', 'dias_2_veces_semana']),
      supabase.from('horarios').select('*').order('hora_inicio'),
    ]).then(([{ data: configData }, { data: horariosData }]) => {
      if (configData) {
        const parse = (clave, fallback) => {
          const v = configData.find(c => c.clave === clave)?.valor
          return v ? v.split(',').map(Number) : fallback
        }
        setDias1x(parse('dias_1_vez_semana', [6]))
        setDias2x(parse('dias_2_veces_semana', [2, 6]))
      }
      setHorarios(horariosData ?? [])
      setConfigLoaded(true)
    })
  }, [])

  const diasNombres1x = dias1x.map(d => ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d]).join(', ')
  const diasNombres2x = dias2x.map(d => ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d]).join(', ')

  if (!configLoaded) {
    return <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-primary-600" /></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Asistencia</h2>
        <p className="text-gray-500 text-sm mt-1">
          1×/sem: <span className="font-medium">{diasNombres1x}</span> · 2×/sem: <span className="font-medium">{diasNombres2x}</span>
        </p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('registro')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
            tab === 'registro' ? 'bg-white text-primary-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <CalendarDays size={15} />
          Registro diario
        </button>
        <button
          onClick={() => setTab('reporte')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
            tab === 'reporte' ? 'bg-white text-primary-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <BarChart2 size={15} />
          Reporte mensual
        </button>
      </div>

      {tab === 'registro'
        ? <Registro dias1x={dias1x} dias2x={dias2x} horarios={horarios} />
        : <Reporte  dias1x={dias1x} dias2x={dias2x} />
      }
    </div>
  )
}
