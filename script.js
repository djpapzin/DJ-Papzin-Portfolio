document.addEventListener('DOMContentLoaded', function() {
    // Initialize name typing animation
    try {
        const nameTyping = new Typed('#typed-name', {
            strings: ['I am Letlhogonolo Fanampe'],
            typeSpeed: 50,
            showCursor: false,
            onComplete: function() {
                // Start roles animation after name is typed
                initRolesTyping();
            }
        });
    } catch (error) {
        console.error('Error initializing name typing:', error);
    }

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
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
    let isExpanded = false;

    viewMoreBtn.addEventListener('click', function() {
        if (!isExpanded) {
            // Add more project cards here
            projectsRow.innerHTML += `
                <div class="col-md-4 mb-4">
                    <div class="card h-100">
                        <img src="assets/chatsnap.png" class="card-img-top" alt="ChatSnap-Extractor">
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title project-title">ChatSnap-Extractor</h5>
                            <p class="card-text flex-grow-1">
                                Django-based web app for extracting text, timestamps, and emojis from chat screenshots with 99%+ accuracy.<br><br>
                                <strong>Technologies:</strong> Python, Django, PaddleOCR, YOLO
                            </p>
                            <div class="mt-auto">
                                <a href="https://github.com/djpapzin/ChatSnap-Extractor" class="btn btn-primary w-100" target="_blank">View Project</a>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- Add more project cards here -->
            `;
            viewMoreBtn.textContent = 'View Less';
            isExpanded = true;
        } else {
            // Remove additional project cards
            projectsRow.innerHTML = projectsRow.innerHTML.split('<div class="col-md-4 mb-4">').slice(0, 4).join('<div class="col-md-4 mb-4">');
            viewMoreBtn.textContent = 'View More';
            isExpanded = false;
        }
    });
});

function initRolesTyping() {
    try {
        const rolesTyping = new Typed('#typed-roles', {
            strings: [
                'AI/ML Engineer | Gen AI | NLP | Python Developer',
                'AI/ML Consultant & Solutions Architect',
                'Generative AI & LLM Integration Expert',
                'Computer Vision & NLP Specialist',
                'Full Stack AI Developer',
                'MLOps & AI Pipeline Engineer'
            ],
            typeSpeed: 40,
            backSpeed: 20,
            backDelay: 2000,
            startDelay: 300,
            loop: true,
            showCursor: true,
            cursorChar: '|',
            autoInsertCss: true,
            fadeOut: true,
            fadeOutClass: 'typed-fade-out',
            fadeOutDelay: 500
        });
    } catch (error) {
        console.error('Error initializing roles typing:', error);
    }
}
