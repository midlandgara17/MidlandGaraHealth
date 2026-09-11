document.addEventListener("DOMContentLoaded", () => {

  const menuButton = document.querySelector(".menu-toggle");
  const navMenu = document.querySelector(".nav-menu");

  if (menuButton && navMenu) {

    menuButton.addEventListener("click", () => {
      navMenu.classList.toggle("open");
    });

  }

  const year = document.querySelector("#year");

  if (year) {
    year.textContent = new Date().getFullYear();
  }

}); 
