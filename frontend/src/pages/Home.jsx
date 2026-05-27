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
            <div className="hero-badge animate-fadeUp"><span className="dot"></span> AI-Powered Study Matching</div>
            <h1 className="hero-title animate-fadeUp delay-1">
              Study Smarter<br/>with the <span>Right People</span>
            </h1>
            <p className="hero-subtitle animate-fadeUp delay-2">
              Connect with students who share your goals, subjects, and schedule. AI-powered matching, real-time collaboration, and goal tracking — all in one place.
            </p>
            <div className="hero-cta animate-fadeUp delay-3">
              <Link to="/signup" className="btn btn-primary btn-lg">🚀 Start for Free</Link>
              <a href="#features" className="btn btn-outline btn-lg">Explore Features</a>
            </div>
            <div className="hero-stats animate-fadeUp delay-4">
              <div className="hero-stat">
                <div className="hero-stat-value"><span>50K+</span></div>
                <div className="hero-stat-label">Active Students</div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-value"><span>12K+</span></div>
                <div className="hero-stat-label">Study Groups</div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-value"><span>94%</span></div>
                <div className="hero-stat-label">Match Accuracy</div>
              </div>
            </div>
          </div>

          {/* Floating Visual Cards */}
          <div className="hero-visual">
            <div className="floating-cards">
              <div className="floating-card fc1">
                <div className="fc-label">🤖 AI Match Found</div>
                <div className="fc-value">Algorithms Study Group</div>
                <div className="fc-sub">95% compatibility score</div>
                <div className="progress-bar fc-progress"><div className="progress-fill" style={{ width: '95%' }}></div></div>
                <div className="fc-members">
                  <div className="fc-avatar">AJ</div>
                  <div className="fc-avatar">SK</div>
                  <div className="fc-avatar">MR</div>
                  <div className="fc-avatar">+5</div>
                </div>
              </div>
              <div className="floating-card fc2">
                <div className="fc-label">📈 Weekly Progress</div>
                <div className="fc-value" style={{ fontSize: '1.8rem', background: 'var(--gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>12h 30m</div>
                <div className="fc-sub" style={{ color: 'var(--success)' }}>↑ 23% from last week</div>
              </div>
              <div className="floating-card fc3">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '1.5rem' }}>🎯</span>
                  <div>
                    <div className="fc-value">Goal Streak</div>
                    <div className="fc-sub">12 days in a row!</div>
                  </div>
                </div>
                <div className="fc-label">Tasks completed this week</div>
                <div className="progress-bar"><div className="progress-fill" style={{ width: '75%' }}></div></div>
                <div className="fc-sub" style={{ marginTop: '4px' }}>18 / 24 tasks</div>
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
              { icon: '🤖', title: 'AI-Powered Matching', desc: 'Our intelligent algorithm analyzes your subjects, schedule, and learning style to find your perfect study partners with up to 95% accuracy.' },
              { icon: '💬', title: 'Real-Time Collaboration', desc: 'Chat, share resources, and work on problems together in real time. Integrated whiteboard and file sharing make sessions seamless.' },
              { icon: '🎯', title: 'Goal & Task Tracking', desc: 'Set academic goals, break them down into actionable tasks, and track your progress with visual dashboards and streak counters.' },
              { icon: '👥', title: 'Smart Study Groups', desc: 'Join or create subject-specific groups with flexible scheduling. Discover groups matched to your academic level and interests.' },
              { icon: '📊', title: 'Progress Analytics', desc: 'Detailed insights into your study habits, time spent, and performance trends. Identify strengths and areas for improvement.' },
              { icon: '🔔', title: 'Smart Reminders', desc: 'Never miss a study session or deadline. Intelligent notifications adapt to your schedule and study patterns.' }
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
              { step: 2, title: 'AI Finds Your Match', desc: 'Our AI analyzes thousands of student profiles to find your best study partners.' },
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

      {/* Testimonials */}
      <section className="testimonials">
        <div className="container">
          <div className="section-header" style={{ textAlign: 'center' }}>
            <div className="section-tag">Testimonials</div>
            <h2 className="section-title">Students <span>Love</span> Smart Study</h2>
          </div>
          <div className="testimonials-grid">
            {[
              { text: '"Smart Study found me the perfect algorithm study group within minutes. Our group went from failing to acing our data structures exam!"', name: 'Sarah Kim', role: 'CS Student, Stanford', initials: 'SK' },
              { text: '"The goal tracker keeps me accountable. I\'ve maintained a 30-day study streak! My GPA improved by a full point this semester."', name: 'Marcus Rivera', role: 'Physics Major, MIT', initials: 'MR' },
              { text: '"I was struggling with calculus alone. Smart Study matched me with 4 study partners at the same level. We all passed with distinction!"', name: 'Priya Mehta', role: 'Engineering, IIT Delhi', initials: 'PM' }
            ].map((item, i) => (
              <div key={i} className="testimonial-card">
                <div className="stars">★★★★★</div>
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
          <p className="section-subtitle" style={{ margin: '0.75rem auto', textAlign: 'center' }}>Join 50,000+ students already transforming their academic journey. Free forever.</p>
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
