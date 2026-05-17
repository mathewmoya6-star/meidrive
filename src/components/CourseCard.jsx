import React from 'react';
import { useNavigate } from 'react-router-dom';

function CourseCard({ course, user }) {
    const navigate = useNavigate();
    const isFree = course.type === 'free';
    const icons = { 1: '🚗', 2: '🚌', 3: '🚸', 4: '⚡', 5: '🛵', 6: '📚', 7: '📝' };

    const handleClick = () => {
        if (!user && !isFree) {
            alert('Please login to access premium courses');
            navigate('/login.html');
        } else {
            navigate(`/course.html?id=${course.id}`);
        }
    };

    return (
        <div className="course-card" onClick={handleClick}>
            <div className="course-icon">{icons[course.id] || '📘'}</div>
            {!isFree && <div className="course-badge">PREMIUM</div>}
            <h3>{course.title}</h3>
            <p>{course.description?.substring(0, 100)}...</p>
            <div className={`course-price ${isFree ? 'free' : 'premium'}`}>
                {isFree ? '🎓 FREE' : `💰 KES ${course.price?.toLocaleString()}`}
            </div>
            <button className="btn-view">View Course →</button>
        </div>
    );
}

export default CourseCard;
