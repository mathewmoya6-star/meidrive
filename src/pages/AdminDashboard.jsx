import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'

export const AdminDashboard = () => {
  const { user, profile } = useAuth()
  const [courses, setCourses] = useState([])
  const [users, setUsers] = useState([])
  const [payments, setPayments] = useState([])
  const [editingCourse, setEditingCourse] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Paginated courses
  useEffect(() => {
    loadCourses()
    loadUsers()
    loadPayments()
  }, [page])

  const loadCourses = async () => {
    const from = (page - 1) * 10
    const to = from + 9
    
    const { data, count } = await supabase
      .from('courses')
      .select('*', { count: 'exact' })
      .range(from, to)
      .order('created_at', { ascending: false })
    
    if (data) {
      setCourses(data)
      setTotalPages(Math.ceil(count / 10))
    }
  }

  const loadUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .limit(20)
      .order('created_at', { ascending: false })
    
    if (data) setUsers(data)
  }

  const loadPayments = async () => {
    const { data } = await supabase
      .from('payments')
      .select('*, courses(name), profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (data) setPayments(data)
  }

  const createCourse = async (courseData) => {
    const { data, error } = await supabase
      .from('courses')
      .insert(courseData)
      .select()
    
    if (!error) {
      setCourses([data[0], ...courses])
      setEditingCourse(null)
    }
    return { data, error }
  }

  const updateCourse = async (id, updates) => {
    const { data, error } = await supabase
      .from('courses')
      .update(updates)
      .eq('id', id)
      .select()
    
    if (!error) {
      setCourses(courses.map(c => c.id === id ? data[0] : c))
      setEditingCourse(null)
    }
    return { data, error }
  }

  const deleteCourse = async (id) => {
    if (!confirm('Delete this course?')) return
    
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id)
    
    if (!error) {
      setCourses(courses.filter(c => c.id !== id))
    }
  }

  if (profile?.role !== 'admin') {
    return <div className="text-center py-20">Access Denied</div>
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600">Total Courses</h3>
          <p className="text-3xl font-bold">{courses.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600">Total Students</h3>
          <p className="text-3xl font-bold">{users.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600">Revenue (KES)</h3>
          <p className="text-3xl font-bold">
            KES {payments.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Course Management */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Course Management</h2>
            <button
              onClick={() => setEditingCourse({})}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              + Add Course
            </button>
          </div>
        </div>

        {editingCourse && (
          <div className="p-6 border-b bg-gray-50">
            <CourseForm
              course={editingCourse}
              onSave={editingCourse.id ? updateCourse : createCourse}
              onCancel={() => setEditingCourse(null)}
            />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">Name</th>
                <th className="px-6 py-3 text-left">Price</th>
                <th className="px-6 py-3 text-left">Type</th>
                <th className="px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map(course => (
                <tr key={course.id} className="border-t">
                  <td className="px-6 py-4">{course.name}</td>
                  <td className="px-6 py-4">KES {course.price?.toLocaleString() || 0}</td>
                  <td className="px-6 py-4">{course.type}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setEditingCourse(course)}
                      className="text-blue-600 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteCourse(course.id)}
                      className="text-red-600"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-6 border-t flex justify-between items-center">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span>Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Recent Payments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">Student</th>
                <th className="px-6 py-3 text-left">Course</th>
                <th className="px-6 py-3 text-left">Amount</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(payment => (
                <tr key={payment.id} className="border-t">
                  <td className="px-6 py-4">{payment.profiles?.full_name || 'N/A'}</td>
                  <td className="px-6 py-4">{payment.courses?.name || 'N/A'}</td>
                  <td className="px-6 py-4">KES {payment.amount?.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      payment.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">{new Date(payment.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Course Form Component
const CourseForm = ({ course, onSave, onCancel }) => {
  const [formData, setFormData] = useState(course.id ? course : {
    name: '',
    description: '',
    price: 0,
    type: 'premium',
    duration: '4 weeks',
    level: 'Beginner'
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    await onSave(course.id, formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Course Name"
          value={formData.name}
          onChange={e => setFormData({...formData, name: e.target.value})}
          className="border rounded px-3 py-2"
          required
        />
        <input
          type="number"
          placeholder="Price (KES)"
          value={formData.price}
          onChange={e => setFormData({...formData, price: parseInt(e.target.value)})}
          className="border rounded px-3 py-2"
        />
        <select
          value={formData.type}
          onChange={e => setFormData({...formData, type: e.target.value})}
          className="border rounded px-3 py-2"
        >
          <option value="free">Free</option>
          <option value="premium">Premium</option>
        </select>
        <select
          value={formData.level}
          onChange={e => setFormData({...formData, level: e.target.value})}
          className="border rounded px-3 py-2"
        >
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
        </select>
        <textarea
          placeholder="Description"
          value={formData.description}
          onChange={e => setFormData({...formData, description: e.target.value})}
          className="border rounded px-3 py-2 md:col-span-2"
          rows="3"
        />
      </div>
      <div className="flex gap-3">
        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">
          Save Course
        </button>
        <button type="button" onClick={onCancel} className="border px-4 py-2 rounded">
          Cancel
        </button>
      </div>
    </form>
  )
}
