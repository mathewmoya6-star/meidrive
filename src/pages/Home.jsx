import React from 'react'
import { Link } from 'react-router-dom'

function Home({ user }) {
  return (
    <div>
      <section className="hero">
        <div className="hero-content">
          <h1>Practice Daily.<br /><span>Revise Smarter. Pass with Confidence.</span></h1>
          <p>For Learners and Experienced Drivers — Refresh Your Skills with MEI DRIVE AFRICA. NTSA-approved courses.</p>
          <div className="hero-buttons">
            {!user ? (
              <>
                <Link to="/register" className="btn-primary">Get Started</Link>
                <Link to="/login" className="btn-outline">Login</Link>
              </>
            ) : (
              <Link to="/dashboard" className="btn-primary">Go to Dashboard</Link>
            )}
          </div>
        </div>
      </section>
      
      <section className="stats">
        <div className="stats-container">
          <div className="stat"><h2>10K+</h2><p>Students</p></div>
          <div className="stat"><h2>8</h2><p>Courses</p></div>
          <div className="stat"><h2>98%</h2><p>Pass Rate</p></div>
        </div>
      </section>

      <a href="https://wa.me/254703738707" className="whatsapp-float" target="_blank" rel="noopener noreferrer">
        <i className="fab fa-whatsapp"></i>
      </a>
    </div>
  )
}

export default Home
