document.addEventListener('DOMContentLoaded', function() {
    // Typed.js initialization for name
    var nameOptions = {
        strings: ['I am Letlhogonolo Fanampe'],
        typeSpeed: 50,
        backSpeed: 50,
        loop: false,
        showCursor: false
    };
    
    var typedName = new Typed('#typed-name', nameOptions);

    // Typed.js initialization for roles
    var rolesOptions = {
        strings: ['AI/ML Engineer', 'Computer Vision Specialist', 'Deep Learning Expert', 'Facial Recognition Developer', 'OCR Innovator'],
        typeSpeed: 50,
        backSpeed: 50,
        loop: true,
        startDelay: 2000 // Start after the name animation is complete
    };
    
    var typedRoles = new Typed('#typed-roles', rolesOptions);

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Change navbar background on scroll
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            document.querySelector('header').classList.add('scrolled');
        } else {
            document.querySelector('header').classList.remove('scrolled');
        }
    });

    // Form submission handling (you can customize this part)
    document.querySelector('form').addEventListener('submit', function(e) {
        e.preventDefault();
        alert('Thank you for your message! I will get back to you soon.');
        this.reset();
    });

    // View More functionality
    const viewMoreBtn = document.getElementById('viewMoreBtn');
    const projectsRow = document.getElementById('projectsRow');
    const additionalProjects = [
        {
            image: "assets/chatsnap.png",
            alt: "ChatSnap-Extractor",
            title: "ChatSnap-Extractor",
            description: "Django-based web app for extracting text, timestamps, and emojis from chat screenshots with 99%+ accuracy.",
            technologies: "Python, Django, PaddleOCR, YOLO",
            link: "https://github.com/djpapzin/ChatSnap-Extractor"
        },
        // Add more projects here
    ];

    function createProjectCard(project) {
        return `
            <div class="col-md-4 mb-4">
                <div class="card h-100">
                    <img src="${project.image}" class="card-img-top" alt="${project.alt}">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title project-title">${project.title}</h5>
                        <p class="card-text flex-grow-1">
                            ${project.description}<br><br>
                            <strong>Technologies:</strong> ${project.technologies}
                        </p>
                        <div class="mt-auto">
                            <a href="${project.link}" class="btn btn-primary w-100" target="_blank">View Project</a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    viewMoreBtn.addEventListener('click', function() {
        if (projectsRow.children.length <= 3) {
            additionalProjects.forEach(project => {
                projectsRow.innerHTML += createProjectCard(project);
            });
            viewMoreBtn.textContent = 'View Less';
        } else {
            while (projectsRow.children.length > 3) {
                projectsRow.removeChild(projectsRow.lastChild);
            }
            viewMoreBtn.textContent = 'View More';
        }
    });
});
