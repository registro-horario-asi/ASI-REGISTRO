// app.js - Lógica de cálculos y utilidades (VERSIÓN COMPATIBLE)

// 1. Formateadores de Fecha y Hora
function formatearFechaHora(fecha) {
  const opciones = { 
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  };
  return new Date(fecha).toLocaleString('es-ES', opciones);
}

function formatearHora(fecha) {
  return new Date(fecha).toLocaleTimeString('es-ES', { hour12: false });
}

function formatearFecha(fecha) {
  return new Date(fecha).toLocaleDateString('es-ES');
}

// 2. Gestión de Empleados
function obtenerNombreEmpleado(id) {
  const empleados = JSON.parse(localStorage.getItem("empleados")) || {};
  const empleado = empleados[id];
  if (empleado) {
    return typeof empleado === 'object' ? empleado.nombre : empleado;
  }
  return "Empleado no encontrado";
}

function obtenerDatosEmpleado(id) {
  return new Promise((resolve, reject) => {
    db.collection("empleados").doc(id).get()
      .then((doc) => resolve(doc.exists ? doc.data() : null))
      .catch((error) => {
        console.error("Error al obtener datos:", error);
        reject(error);
      });
  });
}

// 3. Lógica de Cálculos (SIN LIBRERÍAS EXTERNAS PARA EVITAR ERRORES)
function calcularHorasTrabajadas(entrada, salida, comidaInicio = null, comidaFin = null) {
  if (!entrada || !salida) return 0;

  const hoy = new Date().toISOString().split('T')[0];
  const entradaDate = new Date(`${hoy}T${entrada}:00`);
  const salidaDate = new Date(`${hoy}T${salida}:00`);
  
  let tiempoTotalMs = salidaDate - entradaDate;

  // Si hay registro de comida, se resta
  if (comidaInicio && comidaFin) {
    const cInicio = new Date(`${hoy}T${comidaInicio}:00`);
    const cFin = new Date(`${hoy}T${comidaFin}:00`);
    tiempoTotalMs -= (cFin - cInicio);
  }

  // Convertir milisegundos a horas decimales
  const horas = tiempoTotalMs / (1000 * 60 * 60);
  return Math.max(0, horas); 
}

function calcularHorasExtras(entrada, salida, comidaI, comidaF, entradaNormal, salidaNormal) {
  // Calculamos lo que trabajó realmente
  const horasTrabajadas = calcularHorasTrabajadas(entrada, salida, comidaI, comidaF);
  // Calculamos lo que debería trabajar según contrato
  const horasNormales = calcularHorasTrabajadas(entradaNormal, salidaNormal, comidaI, comidaF);
  
  // La diferencia son las extras
  const extras = horasTrabajadas - horasNormales;
  return extras > 0 ? extras.toFixed(2) : 0;
}

// 4. Utilidades de Interfaz (UI)
function irAPagina(pagina) {
  window.location.href = pagina;
}

function mostrarNombreEmpleado() {
  // Ajustado para coincidir con los IDs de tu index.html (employeeId)
  const idInput = document.getElementById("employeeId") || document.getElementById("idEmpleado");
  const nombreDisplay = document.getElementById("employeeName") || document.getElementById("nombreEmpleado");
  
  if (idInput && nombreDisplay) {
    const id = idInput.value.trim();
    if (id.length >= 3) {
      obtenerDatosEmpleado(id).then(datos => {
        if (datos) {
          nombreDisplay.value = datos.nombre; // Si es un input
          nombreDisplay.textContent = datos.nombre; // Si es un span
        }
      });
    }
  }
}

// 5. Inicialización y Exportación Global
document.addEventListener("DOMContentLoaded", function() {
  const idInput = document.getElementById("employeeId") || document.getElementById("idEmpleado");
  if (idInput) {
    idInput.addEventListener("input", mostrarNombreEmpleado);
  }
});

// Esto permite que el resto de tus archivos vean las funciones
window.appUtils = {
  formatearFechaHora,
  formatearHora,
  formatearFecha,
  obtenerNombreEmpleado,
  obtenerDatosEmpleado,
  calcularHorasTrabajadas,
  calcularHorasExtras,
  irAPagina
};

console.log("✅ app.js cargado con éxito. Lógica de horas extras lista.");

