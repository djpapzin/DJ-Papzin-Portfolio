document.addEventListener('DOMContentLoaded', function() {
    // Typed.js initialization
    var options = {
        strings: ['AI/ML Developer', 'Python Enthusiast', 'Computer Vision Specialist', 'NLP Engineer'],
        typeSpeed: 50,
        backSpeed: 50,
        loop: true
    };
    
    var typed = new Typed('#typed', options);

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
});