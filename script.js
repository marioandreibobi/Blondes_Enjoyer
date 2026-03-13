// ===== DOM ELEMENTS =====
const header = document.querySelector('.header');
const navLinks = document.querySelectorAll('.nav__link');
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const navMenu = document.querySelector('.nav__menu');
const themeToggle = document.querySelector('.theme-toggle');
const themeIcon = document.querySelector('.theme-toggle__icon');
const contactForm = document.getElementById('contactForm');
const currentYearElement = document.getElementById('currentYear');
const greetingElement = document.getElementById('greeting');

// Database-related elements
const portfolioGrid = document.getElementById('portfolioGrid');
const blogGrid = document.getElementById('blogGrid');
const portfolioFilters = document.querySelectorAll('.filter-btn');
const skillsContainers = {
    frontend: document.getElementById('frontendSkills'),
    backend: document.getElementById('backendSkills'),
    database: document.getElementById('databaseSkills'),
    tools: document.getElementById('toolsSkills')
};

// API base URL
const API_BASE = window.location.hostname === 'localhost' && window.location.port === '3000' 
    ? 'http://localhost:3000/api' 
    : '/api';

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
  initializeTheme();
  initializeNavigation();
  initializeScrollEffects();
  initializeFormValidation();
  initializeAnimations();
  updateDynamicContent();
  loadPortfolioData();
  loadBlogData();
  loadSkillsData();
  initializePortfolioFilters();
});

// ===== DATABASE API FUNCTIONS =====

// Load portfolio projects
async function loadPortfolioData(filter = 'all') {
  try {
    const response = await fetch(`${API_BASE}/projects`);
    if (!response.ok) throw new Error('Failed to fetch projects');
    
    const projects = await response.json();
    displayProjects(projects, filter);
  } catch (error) {
    console.error('Error loading projects:', error);
    displayError(portfolioGrid, 'Failed to load projects. Please try again later.');
  }
}

// Display projects in the grid
function displayProjects(projects, filter) {
  if (!portfolioGrid) return;
  
  const filteredProjects = filter === 'all' 
    ? projects 
    : projects.filter(project => project.category === filter);
  
  if (filteredProjects.length === 0) {
    portfolioGrid.innerHTML = '<p class="no-results">No projects found in this category.</p>';
    return;
  }
  
  portfolioGrid.innerHTML = filteredProjects.map((project, index) => `
    <article class="portfolio-item fade-in" data-aos="fade-up" data-aos-delay="${index * 100}">
      <div class="portfolio-item__image">
        <img src="${project.image_url}" alt="${project.title}" loading="lazy" 
             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDYwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI2MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxyZWN0IHg9IjUwIiB5PSI4MCIgd2lkdGg9IjUwMCIgaGVpZ2h0PSIyNDAiIGZpbGw9IiM5Q0EzQUYiLz4KPGNpcmNsZSBjeD0iMzAwIiBjeT0iMjAwIiByPSI0MCIgZmlsbD0iIzZBNjZGMSIvPgo8dGV4dCB4PSIzMDAiIHk9IjIwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTYiPuKAjDwvdGV4dD4KPHRleHQgeD0iMzAwIiB5PSIzMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTQiPiR7cHJvamVjdC50aXRsZX08L3RleHQ+Cjwvc3ZnPgo='">
        <div class="portfolio-item__overlay">
          <a href="${project.project_url || '#'}" class="portfolio-item__link" aria-label="View project details" target="_blank">
            <span>View Project</span>
            <span>→</span>
          </a>
          ${project.github_url ? `
            <a href="${project.github_url}" class="portfolio-item__github" aria-label="View on GitHub" target="_blank">
              <span>GitHub</span>
            </a>
          ` : ''}
        </div>
      </div>
      <div class="portfolio-item__content">
        <h3 class="portfolio-item__title">${project.title}</h3>
        <p class="portfolio-item__description">${project.description}</p>
        <div class="portfolio-item__tags">
          ${project.technologies.split(',').map(tech => 
            `<span class="tag">${tech.trim()}</span>`
          ).join('')}
        </div>
      </div>
    </article>
  `).join('');
  
  // Re-initialize animations for new elements
  initializeAnimations();
}

// Load blog posts
async function loadBlogData() {
  try {
    const response = await fetch(`${API_BASE}/blog`);
    if (!response.ok) throw new Error('Failed to fetch blog posts');
    
    const posts = await response.json();
    displayBlogPosts(posts);
  } catch (error) {
    console.error('Error loading blog posts:', error);
    displayError(blogGrid, 'Failed to load blog posts. Please try again later.');
  }
}

// Display blog posts
function displayBlogPosts(posts) {
  if (!blogGrid) return;
  
  blogGrid.innerHTML = posts.map((post, index) => `
    <article class="blog-item fade-in" data-aos="fade-up" data-aos-delay="${index * 100}">
      <div class="blog-item__image">
        <img src="${post.image_url}" alt="${post.title}" loading="lazy"
             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDYwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI2MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxyZWN0IHg9IjUwIiB5PSI4MCIgd2lkdGg9IjUwMCIgaGVpZ2h0PSIyNDAiIGZpbGw9IiM5Q0EzQUYiLz4KPGNpcmNsZSBjeD0iMzAwIiBjeT0iMjAwIiByPSI0MCIgZmlsbD0iIzZBNjZGMSIvPgo8dGV4dCB4PSIzMDAiIHk9IjIwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTYiPuKAjDwvdGV4dD4KPHRleHQgeD0iMzAwIiB5PSIzMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTQiPiR7cG9zdC50aXRsZX08L3RleHQ+Cjwvc3ZnPgo='">
        <div class="blog-item__overlay">
          <a href="#blog-${post.id}" class="blog-item__link" aria-label="Read full post">
            <span>Read More</span>
            <span>→</span>
          </a>
        </div>
      </div>
      <div class="blog-item__content">
        <div class="blog-item__meta">
          <span class="blog-item__category">${post.category}</span>
          <time class="blog-item__date">${formatDate(post.created_at)}</time>
        </div>
        <h3 class="blog-item__title">${post.title}</h3>
        <p class="blog-item__excerpt">${post.excerpt}</p>
        <a href="#blog-${post.id}" class="blog-item__read-more">Read Full Post →</a>
      </div>
    </article>
  `).join('');
  
  // Re-initialize animations for new elements
  initializeAnimations();
}

// Load skills data
async function loadSkillsData() {
  try {
    const response = await fetch(`${API_BASE}/skills`);
    if (!response.ok) throw new Error('Failed to fetch skills');
    
    const skills = await response.json();
    displaySkills(skills);
  } catch (error) {
    console.error('Error loading skills:', error);
    Object.values(skillsContainers).forEach(container => {
      if (container) {
        displayError(container, 'Failed to load skills. Please try again later.');
      }
    });
  }
}

// Display skills by category
function displaySkills(skills) {
  const skillsByCategory = skills.reduce((acc, skill) => {
    if (!acc[skill.category]) acc[skill.category] = [];
    acc[skill.category].push(skill);
    return acc;
  }, {});
  
  Object.entries(skillsByCategory).forEach(([category, categorySkills]) => {
    const containerKey = category.toLowerCase().replace(' ', '').replace('&', 'and');
    const container = skillsContainers[containerKey];
    
    if (container) {
      container.innerHTML = categorySkills.map(skill => `
        <div class="skill-item fade-in" data-aos="fade-up">
          <div class="skill-item__header">
            <span class="skill-icon">${skill.icon}</span>
            <span class="skill-name">${skill.name}</span>
          </div>
          <div class="skill-level">
            <div class="skill-level__bar">
              <div class="skill-level__progress" style="width: ${skill.level}%"></div>
            </div>
            <span class="skill-level__percentage">${skill.level}%</span>
          </div>
        </div>
      `).join('');
    }
  });
  
  // Re-initialize animations for new elements
  initializeAnimations();
}

// Initialize portfolio filters
function initializePortfolioFilters() {
  portfolioFilters.forEach(filterBtn => {
    filterBtn.addEventListener('click', () => {
      // Update active state
      portfolioFilters.forEach(btn => btn.classList.remove('active'));
      filterBtn.classList.add('active');
      
      // Reload projects with filter
      const filter = filterBtn.dataset.filter;
      loadPortfolioData(filter);
    });
  });
}

// Utility function to display error messages
function displayError(container, message) {
  if (container) {
    container.innerHTML = `<div class="error-message">${message}</div>`;
  }
}

// Format date helper
function formatDate(dateString) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

// ===== THEME MANAGEMENT =====
function initializeTheme() {
  // Check for saved theme preference or default to light
  const savedTheme = localStorage.getItem('theme') || 'light';
  setTheme(savedTheme);
  
  // Theme toggle event listener
  themeToggle.addEventListener('click', toggleTheme);
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  
  // Update theme icon
  if (theme === 'dark') {
    themeIcon.textContent = '☀️';
  } else {
    themeIcon.textContent = '🌙';
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
}

// ===== NAVIGATION =====
function initializeNavigation() {
  // Mobile menu toggle
  mobileMenuToggle.addEventListener('click', toggleMobileMenu);
  
  // Close mobile menu when clicking on a link
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      closeMobileMenu();
    });
  });
  
  // Smooth scrolling for navigation links
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (targetId.startsWith('#')) {
        e.preventDefault();
        scrollToSection(targetId);
        setActiveNavLink(link);
      }
    });
  });
  
  // Set active nav link based on scroll position
  window.addEventListener('scroll', updateActiveNavLink);
  
  // Close mobile menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!navMenu.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
      closeMobileMenu();
    }
  });
}

function toggleMobileMenu() {
  mobileMenuToggle.classList.toggle('active');
  navMenu.classList.toggle('active');
  
  // Prevent body scroll when menu is open
  if (navMenu.classList.contains('active')) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}

function closeMobileMenu() {
  mobileMenuToggle.classList.remove('active');
  navMenu.classList.remove('active');
  document.body.style.overflow = '';
}

function scrollToSection(targetId) {
  const targetSection = document.querySelector(targetId);
  if (targetSection) {
    const headerHeight = header.offsetHeight;
    const targetPosition = targetSection.offsetTop - headerHeight - 20;
    
    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth'
    });
  }
}

function setActiveNavLink(activeLink) {
  navLinks.forEach(link => link.classList.remove('active'));
  activeLink.classList.add('active');
}

function updateActiveNavLink() {
  const sections = document.querySelectorAll('section[id]');
  const scrollPosition = window.scrollY + header.offsetHeight + 100;
  
  sections.forEach(section => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.offsetHeight;
    const sectionId = section.getAttribute('id');
    
    if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
      const correspondingLink = document.querySelector(`.nav__link[href="#${sectionId}"]`);
      if (correspondingLink) {
        setActiveNavLink(correspondingLink);
      }
    }
  });
}

// ===== SCROLL EFFECTS =====
function initializeScrollEffects() {
  // Header scroll effect
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
  
  // Reveal animations on scroll
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, observerOptions);
  
  // Observe elements with animation classes
  const animatedElements = document.querySelectorAll('.fade-in, .slide-in-left, .slide-in-right');
  animatedElements.forEach(element => {
    observer.observe(element);
  });
}

// ===== FORM VALIDATION =====
function initializeFormValidation() {
  if (!contactForm) return;
  
  contactForm.addEventListener('submit', handleFormSubmit);
  
  // Real-time validation
  const inputs = contactForm.querySelectorAll('.form-input');
  inputs.forEach(input => {
    input.addEventListener('blur', () => validateField(input));
    input.addEventListener('input', () => {
      if (input.classList.contains('error')) {
        validateField(input);
      }
    });
  });
}

function validateField(field) {
  const fieldName = field.name;
  const fieldValue = field.value.trim();
  const errorElement = document.getElementById(`${fieldName}Error`);
  
  // Reset error state
  field.classList.remove('error');
  if (errorElement) errorElement.textContent = '';
  
  // Validation rules
  let isValid = true;
  let errorMessage = '';
  
  switch (fieldName) {
    case 'name':
      if (!fieldValue) {
        isValid = false;
        errorMessage = 'Name is required';
      } else if (fieldValue.length < 2) {
        isValid = false;
        errorMessage = 'Name must be at least 2 characters';
      }
      break;
      
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!fieldValue) {
        isValid = false;
        errorMessage = 'Email is required';
      } else if (!emailRegex.test(fieldValue)) {
        isValid = false;
        errorMessage = 'Please enter a valid email address';
      }
      break;
      
    case 'message':
      if (!fieldValue) {
        isValid = false;
        errorMessage = 'Message is required';
      } else if (fieldValue.length < 10) {
        isValid = false;
        errorMessage = 'Message must be at least 10 characters';
      }
      break;
  }
  
  if (!isValid) {
    field.classList.add('error');
    if (errorElement) errorElement.textContent = errorMessage;
  }
  
  return isValid;
}

async function handleFormSubmit(e) {
  e.preventDefault();
  
  // Validate all fields
  const inputs = contactForm.querySelectorAll('.form-input[required]');
  let isFormValid = true;
  
  inputs.forEach(input => {
    if (!validateField(input)) {
      isFormValid = false;
    }
  });
  
  if (!isFormValid) {
    // Focus on first error field
    const firstError = contactForm.querySelector('.form-input.error');
    if (firstError) {
      firstError.focus();
    }
    return;
  }
  
  // Show loading state
  const submitButton = contactForm.querySelector('button[type="submit"]');
  const buttonText = submitButton.querySelector('.btn__text');
  const buttonSpinner = submitButton.querySelector('.btn__spinner');
  
  submitButton.disabled = true;
  buttonText.style.display = 'none';
  buttonSpinner.style.display = 'inline-block';
  
  // Collect form data
  const formData = {
    name: document.getElementById('name').value.trim(),
    email: document.getElementById('email').value.trim(),
    subject: document.getElementById('subject').value.trim(),
    message: document.getElementById('message').value.trim()
  };
  
  try {
    // Submit to database API
    const response = await fetch(`${API_BASE}/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    });
    
    if (!response.ok) {
      throw new Error('Failed to submit form');
    }
    
    const result = await response.json();
    
    // Show success message
    const successMessage = document.getElementById('formSuccess');
    successMessage.style.display = 'block';
    
    // Reset form
    contactForm.reset();
    
    // Hide success message after 5 seconds
    setTimeout(() => {
      successMessage.style.display = 'none';
    }, 5000);
    
    console.log('Form submitted successfully:', result);
    
  } catch (error) {
    console.error('Form submission error:', error);
    // Show error message (you could implement this)
    alert('Failed to submit form. Please try again later.');
  } finally {
    // Reset button state
    submitButton.disabled = false;
    buttonText.style.display = 'inline';
    buttonSpinner.style.display = 'none';
  }
}

// Remove the simulateFormSubmission function since we're using real API
// function simulateFormSubmission() {
//   return new Promise((resolve) => {
//     setTimeout(resolve, 2000);
//   });
// }

// ===== ANIMATIONS =====
function initializeAnimations() {
  // Add animation classes to elements
  const elementsToAnimate = [
    { selector: '.hero__text', class: 'fade-in' },
    { selector: '.hero__visual', class: 'slide-in-right' },
    { selector: '.about__text', class: 'slide-in-left' },
    { selector: '.about__image', class: 'slide-in-right' },
    { selector: '.service-card', class: 'fade-in' },
    { selector: '.portfolio-item', class: 'fade-in' },
    { selector: '.contact__info', class: 'slide-in-left' },
    { selector: '.contact__form', class: 'slide-in-right' }
  ];
  
  elementsToAnimate.forEach(({ selector, class: animationClass }) => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((element, index) => {
      element.classList.add(animationClass);
      // Add stagger effect
      element.style.transitionDelay = `${index * 0.1}s`;
    });
  });
}

// ===== DYNAMIC CONTENT =====
function updateDynamicContent() {
  // Update current year in footer
  if (currentYearElement) {
    currentYearElement.textContent = new Date().getFullYear();
  }
  
  // Update greeting based on time of day
  if (greetingElement) {
    updateGreeting();
    // Update greeting every minute
    setInterval(updateGreeting, 60000);
  }
}

function updateGreeting() {
  if (!greetingElement) return;
  
  const hour = new Date().getHours();
  let greeting;
  
  if (hour < 12) {
    greeting = 'Good morning';
  } else if (hour < 18) {
    greeting = 'Good afternoon';
  } else {
    greeting = 'Good evening';
  }
  
  greetingElement.textContent = greeting;
}

// ===== UTILITY FUNCTIONS =====
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// ===== KEYBOARD NAVIGATION =====
document.addEventListener('keydown', (e) => {
  // Escape key closes mobile menu
  if (e.key === 'Escape' && navMenu.classList.contains('active')) {
    closeMobileMenu();
  }
  
  // Tab key navigation enhancement
  if (e.key === 'Tab') {
    // Add focus styles for better keyboard navigation
    document.body.classList.add('keyboard-nav');
  }
});

document.addEventListener('mousedown', () => {
  // Remove keyboard navigation styles when using mouse
  document.body.classList.remove('keyboard-nav');
});

// ===== PERFORMANCE OPTIMIZATION =====
// Lazy load images when they come into viewport
const imageObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        imageObserver.unobserve(img);
      }
    }
  });
});

// Observe all images with data-src attribute
document.querySelectorAll('img[data-src]').forEach(img => {
  imageObserver.observe(img);
});

// ===== ERROR HANDLING =====
window.addEventListener('error', (e) => {
  console.error('JavaScript error:', e.error);
  // You could implement error reporting here
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
  // You could implement error reporting here
});

// ===== SERVICE WORKER REGISTRATION (Optional) =====
// Uncomment this if you want to add PWA capabilities
/*
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}
*/

// ===== ANALYTICS (Optional) =====
// Uncomment this if you want to add analytics
/*
function initializeAnalytics() {
  // Google Analytics 4 example
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
  
  // Track page views
  gtag('event', 'page_view', {
    page_title: document.title,
    page_location: window.location.href
  });
  
  // Track form submissions
  contactForm.addEventListener('submit', () => {
    gtag('event', 'form_submit', {
      event_category: 'engagement',
      event_label: 'contact_form'
    });
  });
}
*/
