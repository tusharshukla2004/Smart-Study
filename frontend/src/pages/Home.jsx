import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

const Home = () => {
  useEffect(() => {
    // Simple Intersection Observer for animations
    const els = document.querySelectorAll('.animate-on-scroll');
    if (!els.length) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('animate-fadeUp');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.15 });
    els.forEach(el => obs.observe(el));
    
    return () => obs.disconnect();
  }, []);

  return (
    <>
      {/* Hero */}
      <section className="hero page-wrapper">
        <div className="container" style={{ width: '100%', display: 'flex', alignItems: 'center' }}>
          <div className="hero-content">
            <div className="hero-badge animate-fadeUp"><span className="dot"></span> Study Partner Matching</div>
            <h1 className="hero-title animate-fadeUp delay-1">
              Study Smarter<br/>with the <span>Right People</span>
            </h1>
            <p className="hero-subtitle animate-fadeUp delay-2">
              Connect with students who share your subjects and availability. Find study groups, chat in real time, and keep track of your tasks.
            </p>
            <div className="hero-cta animate-fadeUp delay-3">
              <Link to="/signup" className="btn btn-primary btn-lg">🚀 Start for Free</Link>
              <a href="#features" className="btn btn-outline btn-lg">Explore Features</a>
            </div>
            <div className="hero-stats animate-fadeUp delay-4">
              <div className="hero-stat">
                <div className="hero-stat-value"><span>JWT</span></div>
                <div className="hero-stat-label">Protected accounts</div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-value"><span>Live</span></div>
                <div className="hero-stat-label">Group messaging</div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-value"><span>Tasks</span></div>
                <div className="hero-stat-label">Track your work</div>
              </div>
            </div>
          </div>

          {/* Floating Visual Cards */}
          <div className="hero-visual">
            <div className="floating-cards">
              <div className="floating-card fc1">
                <div className="fc-label">📚 Study groups</div>
                <div className="fc-value">Find groups by subject</div>
                <div className="fc-sub">Browse, join, or create a group</div>
              </div>
              <div className="floating-card fc2">
                <div className="fc-label">✅ Task planning</div>
                <div className="fc-value" style={{ fontSize: '1.4rem', background: 'var(--gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Stay organized</div>
                <div className="fc-sub" style={{ color: 'var(--success)' }}>Set priorities and deadlines</div>
              </div>
              <div className="floating-card fc3">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '1.5rem' }}>🎯</span>
                  <div>
                    <div className="fc-value">Group chat</div>
                    <div className="fc-sub">Discuss with your study group</div>
                  </div>
                </div>
                <div className="fc-label">Messages update in real time</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section" id="features">
        <div className="container">
          <div className="section-header" style={{ textAlign: 'center' }}>
            <div className="section-tag">Features</div>
            <h2 className="section-title">Everything You Need to <span>Excel</span></h2>
            <p className="section-subtitle" style={{ margin: '0.75rem auto 0' }}>Powerful tools designed to make your study sessions more productive, engaging, and effective.</p>
          </div>
          <div className="features-grid">
            {[
              { icon: '🤖', title: 'Study Partner Matching', desc: 'Get a ranked list of study partners using shared subjects and overlapping availability.' },
              { icon: '💬', title: 'Real-Time Group Chat', desc: 'Exchange persisted messages live with members of your study groups.' },
              { icon: '🎯', title: 'Task Tracking', desc: 'Create tasks with subjects, priorities, and deadlines, then track completion.' },
              { icon: '👥', title: 'Study Groups', desc: 'Create groups, browse by subject or level, and join or leave groups.' },
              { icon: '👤', title: 'Study Profile', desc: 'Maintain your academic profile, subjects, and availability to improve matching.' },
              { icon: '🔐', title: 'Protected Accounts', desc: 'Sign in with a hashed password and use token-protected account features.' }
            ].map((feature, i) => (
              <div key={i} className="feature-card animate-on-scroll">
                <span className="feature-icon">{feature.icon}</span>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-desc">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="how-section">
        <div className="container">
          <div className="section-header" style={{ textAlign: 'center' }}>
            <div className="section-tag">How It Works</div>
            <h2 className="section-title">Get Started in <span>4 Steps</span></h2>
          </div>
          <div className="steps-grid">
            {[
              { step: 1, title: 'Create Your Profile', desc: 'Sign up and tell us your subjects, goals, availability, and learning preferences.' },
              { step: 2, title: 'Find Study Partners', desc: 'Matching ranks profiles by shared subjects and availability overlap.' },
              { step: 3, title: 'Join or Create Groups', desc: 'Connect with matched students, join existing groups, or start your own.' },
              { step: 4, title: 'Study & Track Goals', desc: 'Collaborate in real time, track tasks, and watch your grades improve together.' }
            ].map((item, i) => (
              <div key={i} className="step-card">
                <div className="step-num">{item.step}</div>
                <h3 className="step-title">{item.title}</h3>
                <p className="step-desc">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product overview */}
      <section className="testimonials">
        <div className="container">
          <div className="section-header" style={{ textAlign: 'center' }}>
            <div className="section-tag">Study Together</div>
            <h2 className="section-title">A simple flow from <span>match to study</span></h2>
          </div>
          <div className="testimonials-grid">
            {[
              { text: 'Add your subjects, academic level, and preferred study availability to your profile.', name: 'Build your profile', role: 'Personalize your study details', initials: '1' },
              { text: 'Browse group recommendations and connect with students whose study interests overlap with yours.', name: 'Find your people', role: 'Groups and study partners', initials: '2' },
              { text: 'Coordinate in real-time group chat and keep your own study tasks organized by priority and deadline.', name: 'Study with a plan', role: 'Chat and task tracking', initials: '3' }
            ].map((item, i) => (
              <div key={i} className="testimonial-card">
                <p className="testimonial-text">{item.text}</p>
                <div className="testimonial-user">
                  <div className="avatar avatar-md">{item.initials}</div>
                  <div>
                    <div className="testimonial-name">{item.name}</div>
                    <div className="testimonial-role">{item.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="container">
          <div className="section-tag">Join Today</div>
          <h2 className="section-title">Ready to Study <span>Smarter?</span></h2>
          <p className="section-subtitle" style={{ margin: '0.75rem auto', textAlign: 'center' }}>Create an account to find study partners, groups, and tools for organizing your work.</p>
          <div className="cta-btns">
            <Link to="/signup" className="btn btn-primary btn-lg">🚀 Create Free Account</Link>
            <Link to="/login" className="btn btn-outline btn-lg">Sign In</Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
};

export default Home;
