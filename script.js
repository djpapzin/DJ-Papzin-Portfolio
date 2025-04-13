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

    // Enhanced consultation form handling
    const consultationForm = document.getElementById('consultationForm');
    if (consultationForm) {
        // Add loading spinner to submit button
        const submitBtn = consultationForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        
        // Form validation feedback
        const inputs = consultationForm.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('invalid', function(e) {
                e.preventDefault();
                this.classList.add('is-invalid');
            });
            
            input.addEventListener('input', function() {
                if (this.classList.contains('is-invalid')) {
                    this.classList.remove('is-invalid');
                }
            });
        });

        consultationForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Show loading state
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Processing...';
            
            try {
                const formData = {
                    name: document.getElementById('name').value,
                    email: document.getElementById('email').value,
                    service: document.getElementById('serviceType').value,
                    dateTime: document.getElementById('consultationDateTime').value,
                    details: document.getElementById('projectDetails').value
                };
                
                // Simulate API call (replace with actual API endpoint)
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                // Show success message
                const successAlert = document.createElement('div');
                successAlert.className = 'alert alert-success mt-3 animate__animated animate__fadeIn';
                successAlert.innerHTML = `
                    <h5>Consultation Request Received!</h5>
                    <p>Thank you ${formData.name}! I will contact you shortly to confirm your consultation for ${new Date(formData.dateTime).toLocaleString()}.</p>
                `;
                
                this.insertAdjacentElement('afterend', successAlert);
                
                // Reset form
                this.reset();
                
                // Remove success message after 5 seconds
                setTimeout(() => {
                    successAlert.classList.replace('animate__fadeIn', 'animate__fadeOut');
                    setTimeout(() => successAlert.remove(), 1000);
                }, 5000);
                
            } catch (error) {
                // Show error message
                const errorAlert = document.createElement('div');
                errorAlert.className = 'alert alert-danger mt-3';
                errorAlert.textContent = 'There was an error submitting your request. Please try again.';
                this.insertAdjacentElement('afterend', errorAlert);
                
                // Remove error message after 5 seconds
                setTimeout(() => errorAlert.remove(), 5000);
            } finally {
                // Reset button state
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        });
    }

    // Project filtering
    const filterButtons = document.querySelectorAll('.btn-filter');
    const projectItems = document.querySelectorAll('.project-item');

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            button.classList.add('active');

            const filterValue = button.getAttribute('data-filter');

            projectItems.forEach(item => {
                if (filterValue === 'all' || item.classList.contains(filterValue)) {
                    item.classList.remove('hidden');
                    setTimeout(() => {
                        item.style.display = 'block';
                    }, 300);
                } else {
                    item.classList.add('hidden');
                    setTimeout(() => {
                        item.style.display = 'none';
                    }, 300);
                }
            });
        });
    });

    // Project filtering functionality
    const projectFilters = document.querySelectorAll('.btn-filter');
    const projectItems = document.querySelectorAll('.project-item');

    projectFilters.forEach(filter => {
        filter.addEventListener('click', function() {
            const category = this.dataset.filter;
            
            // Update active filter button
            projectFilters.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Filter projects
            projectItems.forEach(item => {
                if (category === 'all' || item.classList.contains(category)) {
                    item.style.display = 'block';
                    // Add animation
                    item.classList.add('fade-in');
                    setTimeout(() => item.classList.remove('fade-in'), 500);
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });

    // Initialize project metrics counters
    const metrics = document.querySelectorAll('.project-metric-value');
    metrics.forEach(metric => {
        const target = parseInt(metric.getAttribute('data-target'));
        const increment = target / 20;
        let current = 0;
        
        const updateCount = () => {
            if (current < target) {
                current += increment;
                metric.textContent = Math.ceil(current);
                requestAnimationFrame(updateCount);
            } else {
                metric.textContent = target;
            }
        };
        
        // Start counter when element is in viewport
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    updateCount();
                    observer.unobserve(entry.target);
                }
            });
        });
        
        observer.observe(metric);
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
