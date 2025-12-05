// Archivo: /public/js/accesibilidad.js

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. LEER MEMORIA
    let currentFontSize = localStorage.getItem('access_fontSize') || 'normal';
    let currentTheme = localStorage.getItem('access_theme') || 'standard';

    // 2. APLICAR AL CARGAR (¡Esto es lo que hace que no se resetee!)
    applySettings(currentFontSize, currentTheme);

    // --- FUNCIONES ---
    function applySettings(fontSize, theme) {
        document.documentElement.setAttribute('data-font-size', fontSize);
        document.body.setAttribute('data-theme', theme);
        updateModalUI(fontSize, theme);
    }

    function updateModalUI(fontSize, theme) {
        // ... (Tu código de actualizar botones UI va aquí igual que antes) ...
        // Copia aquí todo el contenido de tu función updateModalUI
        
        // --- Actualizar botones fuente ---
        document.querySelectorAll('.btn-font-size').forEach(btn => {
             // ... lógica de fuente ...
             btn.classList.remove('btn-primary', 'active');
             btn.classList.add('btn-outline-secondary');
             btn.classList.remove('text-white');
             if(btn.dataset.value === fontSize) {
                btn.classList.remove('btn-outline-secondary');
                btn.classList.add('btn-primary', 'active');
             }
        });

        // --- Actualizar botones tema ---
        document.querySelectorAll('.btn-theme').forEach(btn => {
             // ... lógica de tema ...
             btn.className = 'btn btn-outline-secondary d-flex justify-content-between align-items-center p-3 btn-theme';
             const icon = btn.querySelector('.check-icon');
             if(icon) icon.classList.add('d-none');
             
             if(btn.dataset.value === theme) {
                btn.classList.remove('btn-outline-secondary');
                btn.classList.add('btn-primary', 'active');
                if(icon) icon.classList.remove('d-none');
             }
        });
    }

    // --- LISTENERS ---
    
    // Botones Fuente
    document.querySelectorAll('.btn-font-size').forEach(btn => {
        btn.addEventListener('click', function() {
            currentFontSize = this.dataset.value;
            updateModalUI(currentFontSize, currentTheme);
            document.documentElement.setAttribute('data-font-size', currentFontSize);
        });
    });

    // Botones Tema
    document.querySelectorAll('.btn-theme').forEach(btn => {
        btn.addEventListener('click', function() {
            currentTheme = this.dataset.value;
            updateModalUI(currentFontSize, currentTheme);
            document.body.setAttribute('data-theme', currentTheme);
        });
    });

    // Botón Guardar
    const btnSave = document.getElementById('btn-save-accessibility');
    if(btnSave){
        btnSave.addEventListener('click', () => {
            localStorage.setItem('access_fontSize', currentFontSize);
            localStorage.setItem('access_theme', currentTheme);
            applySettings(currentFontSize, currentTheme);
        });
    }
});