// Constantes
const STORAGE_KEY_REGISTROS = 'merch_registros';
const STORAGE_KEY_CONFIG = 'merch_config';
const STORAGE_KEY_USUARIOS = 'merch_usuarios';

// Variables Globales
let registros = [];
let usuarios = ['María', 'Juan'];
let config = {
    Cuaderno: 50,
    Lapicera: 50,
    Botella: 50
};

// Items a trackear en el dashboard
const TRACKED_ITEMS = [
    { id: 'Cuaderno', icon: 'fa-book' },
    { id: 'Lapicera', icon: 'fa-pen' },
    { id: 'Botella', icon: 'fa-bottle-water' }
];

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    cargarDatos();
    
    // Setear fecha de hoy en el filtro y en el registro
    const inputFecha = document.getElementById('fechaFiltro');
    const inputFechaRegistro = document.getElementById('fechaRegistroInput');
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    const fechaHoyStr = `${yyyy}-${mm}-${dd}`;
    inputFecha.value = fechaHoyStr;
    inputFechaRegistro.value = fechaHoyStr;
    
    renderUsuarios();
    actualizarDashboard();
    
    // Listeners
    document.getElementById('registroForm').addEventListener('submit', guardarRegistro);
    document.getElementById('configForm').addEventListener('submit', guardarConfig);
    document.getElementById('addUserForm').addEventListener('submit', agregarUsuario);
    document.getElementById('fechaFiltro').addEventListener('change', actualizarDashboard);
    
    // Listener para actualizar dashboard cuando cambian de pestaña
    const pillsTab = document.querySelectorAll('button[data-bs-toggle="pill"]');
    pillsTab.forEach(tab => {
        tab.addEventListener('shown.bs.tab', (event) => {
            if(event.target.id === 'pills-resumen-tab') {
                actualizarDashboard();
            }
        });
    });
});

// ===============================
// LÓGICA DE DATOS (LOCALSTORAGE)
// ===============================
function cargarDatos() {
    const regGuardados = localStorage.getItem(STORAGE_KEY_REGISTROS);
    if (regGuardados) {
        registros = JSON.parse(regGuardados);
    }
    
    const configGuardada = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (configGuardada) {
        config = JSON.parse(configGuardada);
        // Cargar en los inputs de config
        document.getElementById('stockCuaderno').value = config.Cuaderno || 50;
        document.getElementById('stockLapicera').value = config.Lapicera || 50;
        document.getElementById('stockBotella').value = config.Botella || 50;
    }
    
    const usuariosGuardados = localStorage.getItem(STORAGE_KEY_USUARIOS);
    if (usuariosGuardados) {
        usuarios = JSON.parse(usuariosGuardados);
    }
}

function guardarRegistro(e) {
    e.preventDefault();
    
    const fechaSeleccionada = document.getElementById('fechaRegistroInput').value;
    const [yyyy, mm, dd] = fechaSeleccionada.split('-');
    const ahora = new Date();
    
    // Crear objeto fecha combinando la fecha seleccionada con la hora actual
    const fechaRegistro = new Date(yyyy, mm - 1, dd, ahora.getHours(), ahora.getMinutes(), ahora.getSeconds());
    
    const nuevoRegistro = {
        id: Date.now(),
        fecha: fechaRegistro.toISOString(),
        fechaISO: fechaSeleccionada, // Formato YYYY-MM-DD
        fechaLocal: fechaRegistro.toLocaleDateString('es-AR'), // Para mostrar visualmente
        item: document.getElementById('itemInput').value,
        cantidad: parseInt(document.getElementById('cantidadInput').value),
        voucher: document.getElementById('voucherInput').value,
        destino: document.getElementById('destinoInput').value,
        usuario: document.getElementById('usuarioInput').value,
        observaciones: document.getElementById('obsInput').value || ''
    };
    
    registros.push(nuevoRegistro);
    localStorage.setItem(STORAGE_KEY_REGISTROS, JSON.stringify(registros));
    
    // Resetear formulario (excepto usuario y destino para agilizar)
    document.getElementById('itemInput').value = '';
    document.getElementById('cantidadInput').value = '1';
    document.getElementById('voucherInput').value = '';
    document.getElementById('obsInput').value = '';
    
    // Alerta de éxito
    Swal.fire({
        icon: 'success',
        title: '¡Guardado!',
        text: 'El registro se ha guardado correctamente.',
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
    });
}

function guardarConfig(e) {
    e.preventDefault();
    
    config = {
        Cuaderno: parseInt(document.getElementById('stockCuaderno').value),
        Lapicera: parseInt(document.getElementById('stockLapicera').value),
        Botella: parseInt(document.getElementById('stockBotella').value)
    };
    
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    
    Swal.fire({
        icon: 'success',
        title: 'Configuración Guardada',
        text: 'El stock inicial ha sido actualizado.',
        timer: 1500,
        showConfirmButton: false
    });
}

function borrarDatos() {
    Swal.fire({
        title: '¿Estás seguro?',
        text: "¡Se borrarán todos los registros y no podrás recuperarlos!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, borrar todo',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem(STORAGE_KEY_REGISTROS);
            registros = [];
            actualizarDashboard();
            Swal.fire(
                'Borrado',
                'Los datos han sido eliminados.',
                'success'
            );
        }
    });
}

// ===============================
// LÓGICA DE DASHBOARD
// ===============================

function actualizarDashboard() {
    const fechaSeleccionada = document.getElementById('fechaFiltro').value; // Formato YYYY-MM-DD
    
    // Filtrar solo registros del día seleccionado
    const registrosDia = registros.filter(r => {
        if (r.fechaISO) {
            return r.fechaISO === fechaSeleccionada;
        } else {
            // Fallback por si hay registros viejos solo con fechaLocal
            const [year, month, day] = fechaSeleccionada.split('-');
            const fechaFormateada = `${parseInt(day)}/${parseInt(month)}/${year}`;
            return r.fechaLocal === fechaFormateada;
        }
    });
    
    let totalSinVoucher = 0;
    const cardsContainer = document.getElementById('dashboardCards');
    cardsContainer.innerHTML = '';
    
    // Generar tarjetas para Cuaderno, Lapicera, Botella
    TRACKED_ITEMS.forEach(tracked => {
        const regsItem = registrosDia.filter(r => r.item === tracked.id);
        const entregados = regsItem.reduce((acc, curr) => acc + curr.cantidad, 0);
        const sinVoucher = regsItem.filter(r => r.voucher === 'No').reduce((acc, curr) => acc + curr.cantidad, 0);
        const stockIni = config[tracked.id] || 0;
        const sobrantes = stockIni - entregados;
        
        totalSinVoucher += sinVoucher;
        
        cardsContainer.innerHTML += `
            <div class="col-md-4">
                <div class="card stat-card shadow-sm border-0 rounded-4 h-100">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h5 class="card-title text-brown fw-bold m-0">${tracked.id}</h5>
                            <i class="fa-solid ${tracked.icon} fs-3 text-orange opacity-75"></i>
                        </div>
                        <div class="row text-center g-2">
                            <div class="col-6">
                                <div class="p-2 bg-light rounded-3">
                                    <small class="d-block text-muted">Entregados</small>
                                    <span class="fs-4 fw-bold text-primary">${entregados}</span>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="p-2 bg-light rounded-3">
                                    <small class="d-block text-muted">Sobrantes</small>
                                    <span class="fs-4 fw-bold ${sobrantes < 5 ? 'text-danger' : 'text-success'}">${sobrantes}</span>
                                </div>
                            </div>
                            <div class="col-12 mt-2">
                                <div class="p-2 bg-pastel rounded-3 border border-warning border-opacity-25">
                                    <small class="d-block text-brown">Sin Voucher</small>
                                    <span class="fs-5 fw-bold text-danger">${sinVoucher}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    // Alerta de vouchers
    const alertaContainer = document.getElementById('alertaVoucherContainer');
    if (totalSinVoucher > 5) {
        alertaContainer.innerHTML = `
            <div class="alert alert-danger shadow-sm border-0 d-flex align-items-center" role="alert">
                <i class="fa-solid fa-triangle-exclamation fs-4 me-3"></i>
                <div>
                    <strong>⚠️ REVISAR</strong><br>
                    Hay muchos items entregados sin voucher hoy (${totalSinVoucher} en total).
                </div>
            </div>
        `;
    } else {
        alertaContainer.innerHTML = `
            <div class="alert alert-success shadow-sm border-0 d-flex align-items-center" role="alert">
                <i class="fa-solid fa-circle-check fs-4 me-3"></i>
                <div>
                    <strong>✅ Todo en orden</strong><br>
                    Cantidad de items sin voucher dentro de lo normal.
                </div>
            </div>
        `;
    }
    
    // Métricas de usuarios
    const usuariosCardsContainer = document.getElementById('dashboardUsuariosCards');
    usuariosCardsContainer.innerHTML = '';
    
    usuarios.forEach(u => {
        const regsUsuario = registrosDia.filter(r => r.usuario === u).length;
        usuariosCardsContainer.innerHTML += `
            <div class="col-md-6 col-lg-4">
                <div class="card border-0 shadow-sm rounded-4 text-center p-3 user-card h-100">
                    <h5 class="text-orange"><i class="fa-solid fa-user-circle me-2"></i>${u}</h5>
                    <h2 class="fw-bold mb-0">${regsUsuario}</h2>
                    <small class="text-muted">registros hoy</small>
                </div>
            </div>
        `;
    });
    
    // Tabla registros del día
    const tabla = document.getElementById('ultimosRegistrosTable');
    tabla.innerHTML = '';
    
    if(registrosDia.length === 0) {
        tabla.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No hay registros para esta fecha</td></tr>';
    } else {
        // Ordenamos los registros del día desde el más reciente
        const ordenadosDia = [...registrosDia].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        ordenadosDia.forEach(r => {
            const hora = new Date(r.fecha).toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'});
            let badgeColor = r.voucher === 'Sí' ? 'bg-success' : (r.voucher === 'No' ? 'bg-danger' : 'bg-warning text-dark');
            
            tabla.innerHTML += `
                <tr>
                    <td><small class="text-muted">${hora}</small></td>
                    <td class="fw-bold">${r.item}</td>
                    <td>${r.cantidad}</td>
                    <td><span class="badge ${badgeColor}">${r.voucher}</span></td>
                    <td><i class="fa-solid fa-user-circle me-1 text-muted"></i> ${r.usuario}</td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-secondary me-1" onclick="editarRegistro(${r.id})" title="Editar"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="eliminarRegistro(${r.id})" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    }
}

// ===============================
// EDICIÓN Y ELIMINACIÓN DE REGISTROS
// ===============================

function eliminarRegistro(id) {
    Swal.fire({
        title: '¿Eliminar registro?',
        text: "Esta acción no se puede deshacer.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Eliminar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            registros = registros.filter(r => r.id !== id);
            localStorage.setItem(STORAGE_KEY_REGISTROS, JSON.stringify(registros));
            actualizarDashboard();
            Swal.fire({
                icon: 'success',
                title: 'Eliminado',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1500
            });
        }
    });
}

async function editarRegistro(id) {
    const r = registros.find(reg => reg.id === id);
    if (!r) return;
    
    const { value: formValues } = await Swal.fire({
        title: 'Editar Registro',
        html: `
            <div class="text-start">
                <label class="form-label mt-2 fw-bold">Item</label>
                <select id="swal-item" class="form-select">
                    <option value="Cuaderno" ${r.item==='Cuaderno'?'selected':''}>Cuaderno</option>
                    <option value="Lapicera" ${r.item==='Lapicera'?'selected':''}>Lapicera</option>
                    <option value="Botella" ${r.item==='Botella'?'selected':''}>Botella</option>
                    <option value="Separador" ${r.item==='Separador'?'selected':''}>Separador</option>
                    <option value="Bolsa" ${r.item==='Bolsa'?'selected':''}>Bolsa</option>
                </select>
                <label class="form-label mt-3 fw-bold">Cantidad</label>
                <input id="swal-cantidad" type="number" class="form-control" value="${r.cantidad}" min="1">
                <label class="form-label mt-3 fw-bold">¿Voucher?</label>
                <select id="swal-voucher" class="form-select">
                    <option value="Sí" ${r.voucher==='Sí'?'selected':''}>Sí</option>
                    <option value="No" ${r.voucher==='No'?'selected':''}>No</option>
                    <option value="Pendiente" ${r.voucher==='Pendiente'?'selected':''}>Pendiente</option>
                </select>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Guardar Cambios',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            return {
                item: document.getElementById('swal-item').value,
                cantidad: parseInt(document.getElementById('swal-cantidad').value),
                voucher: document.getElementById('swal-voucher').value
            }
        }
    });
    
    if (formValues) {
        // Actualizar el registro
        const index = registros.findIndex(reg => reg.id === id);
        registros[index].item = formValues.item;
        registros[index].cantidad = formValues.cantidad;
        registros[index].voucher = formValues.voucher;
        
        localStorage.setItem(STORAGE_KEY_REGISTROS, JSON.stringify(registros));
        actualizarDashboard();
        
        Swal.fire({
            icon: 'success',
            title: 'Actualizado',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 1500
        });
    }
}

// ===============================
// GESTIÓN DE USUARIOS
// ===============================

function renderUsuarios() {
    // 1. Select de Registro
    const selectRegistro = document.getElementById('usuarioInput');
    selectRegistro.innerHTML = '<option value="" disabled selected>Seleccionar...</option>';
    usuarios.forEach(u => {
        selectRegistro.innerHTML += `<option value="${u}">${u}</option>`;
    });
    
    // 2. Tabla en Config
    const tablaConfig = document.getElementById('configUsuariosTable');
    if (tablaConfig) {
        tablaConfig.innerHTML = '';
        usuarios.forEach(u => {
            tablaConfig.innerHTML += `
                <tr>
                    <td class="fw-bold"><i class="fa-solid fa-user-circle text-muted me-2"></i>${u}</td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-secondary me-1" onclick="editarUsuario('${u}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="eliminarUsuario('${u}')" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    }
}

function agregarUsuario(e) {
    e.preventDefault();
    const input = document.getElementById('nuevoUsuarioInput');
    const nuevoUsuario = input.value.trim();
    
    if(nuevoUsuario && !usuarios.includes(nuevoUsuario)) {
        usuarios.push(nuevoUsuario);
        localStorage.setItem(STORAGE_KEY_USUARIOS, JSON.stringify(usuarios));
        input.value = '';
        renderUsuarios();
        actualizarDashboard();
        Swal.fire({
            icon: 'success',
            title: 'Usuario Agregado',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 1500
        });
    } else if (usuarios.includes(nuevoUsuario)) {
        Swal.fire('Error', 'Este usuario ya existe.', 'error');
    }
}

async function editarUsuario(nombreActual) {
    const { value: nuevoNombre } = await Swal.fire({
        title: 'Editar Usuario',
        input: 'text',
        inputValue: nombreActual,
        showCancelButton: true,
        inputValidator: (value) => {
            if (!value) return 'El nombre no puede estar vacío';
            if (value !== nombreActual && usuarios.includes(value)) return 'Ese usuario ya existe';
        }
    });

    if (nuevoNombre && nuevoNombre !== nombreActual) {
        // Actualizar array de usuarios
        const index = usuarios.indexOf(nombreActual);
        usuarios[index] = nuevoNombre;
        localStorage.setItem(STORAGE_KEY_USUARIOS, JSON.stringify(usuarios));
        
        // Actualizar todos los registros existentes
        let registrosModificados = false;
        registros.forEach(r => {
            if (r.usuario === nombreActual) {
                r.usuario = nuevoNombre;
                registrosModificados = true;
            }
        });
        
        if (registrosModificados) {
            localStorage.setItem(STORAGE_KEY_REGISTROS, JSON.stringify(registros));
        }
        
        renderUsuarios();
        actualizarDashboard();
        
        Swal.fire({
            icon: 'success',
            title: 'Usuario Actualizado',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 1500
        });
    }
}

function eliminarUsuario(nombre) {
    // Comprobar si tiene registros
    const tieneRegistros = registros.some(r => r.usuario === nombre);
    if(tieneRegistros) {
        Swal.fire('No se puede eliminar', `El usuario ${nombre} tiene registros históricos. Para mantener la consistencia, si quieres cambiar su nombre, usa el botón Editar en su lugar.`, 'error');
        return;
    }
    
    Swal.fire({
        title: `¿Eliminar a ${nombre}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            usuarios = usuarios.filter(u => u !== nombre);
            localStorage.setItem(STORAGE_KEY_USUARIOS, JSON.stringify(usuarios));
            renderUsuarios();
            actualizarDashboard();
            Swal.fire({
                icon: 'success',
                title: 'Eliminado',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1500
            });
        }
    });
}

// ===============================
// EXPORTAR A EXCEL (SheetJS)
// ===============================
function exportarExcel() {
    if (registros.length === 0) {
        Swal.fire('Sin datos', 'No hay registros para exportar.', 'info');
        return;
    }
    
    const fechaFiltro = document.getElementById('fechaFiltro').value;
    
    // Ordenar todos los registros por fecha (más reciente primero) para que esté organizado por fecha
    const registrosOrdenados = [...registros].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    // Preparar datos para Excel
    const datosExcel = registrosOrdenados.map(r => {
        const dateObj = new Date(r.fecha);
        return {
            'Fecha Registro': dateObj.toLocaleDateString('es-AR'),
            'Hora': dateObj.toLocaleTimeString('es-AR'),
            'Item': r.item,
            'Cantidad': r.cantidad,
            '¿Voucher?': r.voucher,
            'Destino': r.destino,
            'Usuario': r.usuario,
            'Observaciones': r.observaciones
        };
    });
    
    // Crear workbook
    const ws = XLSX.utils.json_to_sheet(datosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Registros");
    
    // Ajustar ancho de columnas básico
    const wscols = [
        {wch:12}, // Fecha
        {wch:10}, // Hora
        {wch:15}, // Item
        {wch:10}, // Cant
        {wch:12}, // Voucher
        {wch:20}, // Destino
        {wch:15}, // Usuario
        {wch:30}  // Obs
    ];
    ws['!cols'] = wscols;
    
    // Guardar archivo
    XLSX.writeFile(wb, `Control_Merch_Completo.xlsx`);
    
    Swal.fire({
        icon: 'success',
        title: 'Excel Generado',
        text: 'Se ha descargado tu archivo de Excel.',
        timer: 2000,
        showConfirmButton: false
    });
}
