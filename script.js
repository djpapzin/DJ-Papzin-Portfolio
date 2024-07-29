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
    const additionalProjects = document.getElementById('additionalProjects');
    let isExpanded = false;

    const allProjects = [
        // Add all your projects here, including the initial visible ones
        {
            image: "assets/truthguard.jpg",
            alt: "TruthGuard",
            title: "TruthGuard",
            description: "AI-powered system to combat fake news using Llama 3, featuring real-time detection and content moderation across digital platforms.",
            technologies: "Python, Flask, Together AI (Llama 3), Pandas, Scikit-learn, LlamaIndex, Milvus",
            demoLink: "https://truth-guard-dusky.vercel.app/",
            presentationLink: "https://lablab.ai/event/llama-3-ai-hackathon/truth-defenders/truthguard",
            projectLink: "https://github.com/djpapzin/TruthGuard-AI-Fake-News-Detection-with-LLM"
        },
        // Add the rest of your projects here
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
                            ${project.demoLink ? `<a href="${project.demoLink}" class="btn btn-info w-100 mb-2" target="_blank">View Demo</a>` : ''}
                            ${project.presentationLink ? `<a href="${project.presentationLink}" class="btn btn-presentation w-100 mb-2" target="_blank">View Presentation</a>` : ''}
                            <a href="${project.projectLink}" class="btn btn-primary w-100" target="_blank">View Project</a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function initializeProjects() {
        const visibleProjects = allProjects.slice(0, 3);
        const hiddenProjects = allProjects.slice(3);

        projectsRow.innerHTML = visibleProjects.map(createProjectCard).join('');
        additionalProjects.innerHTML = hiddenProjects.map(createProjectCard).join('');
    }

    viewMoreBtn.addEventListener('click', function() {
        if (!isExpanded) {
            additionalProjects.style.display = 'flex';
            viewMoreBtn.textContent = 'View Less';
            isExpanded = true;
        } else {
            additionalProjects.style.display = 'none';
            viewMoreBtn.textContent = 'View More';
            isExpanded = false;
        }
    });

    // Initialize the projects when the page loads
    window.addEventListener('DOMContentLoaded', initializeProjects);
});
