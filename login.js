document.addEventListener("DOMContentLoaded", () => { // Asegura que el DOM esté cargado(html cargado)
  //busca clase loginForm  y los 2 id
  const form = document.querySelector(".loginForm");
  const email = document.getElementById("email");
  const password = document.getElementById("contraseña");

  form.addEventListener("submit", (event) => { //el boton de form es type submit
    let valido = true;

    // Validar email
    if (!email.includes("@")) {
      mostrarError(email, "El correo no es válido");
      valido = false;
    } else {
      quitarError(email);
    }

    // Validar contraseña
    if (password.value.length < 8) {
      mostrarError(password, "La contraseña debe tener al menos 8 caracteres");
      valido = false;
    } else {
      quitarError(password);
    }

    if (!valido) event.preventDefault(); // Evita que se envíe si hay errores
  });
});

function mostrarError(campo, mensaje) {
  let span = campo.parentNode.querySelector(".error");
  if (!span) {
    span = document.createElement("span");
    span.className = "error text-danger";
    campo.parentNode.appendChild(span);
  }
  span.textContent = mensaje;
}

function quitarError(campo) {
  const span = campo.parentNode.querySelector(".error");
  if (span) span.textContent = "";
}