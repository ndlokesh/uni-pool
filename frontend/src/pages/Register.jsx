import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../services/authService';
import Navbar from '../components/Navbar';

const Register = () => {
    const [name, setName] = useState('');
    const [studentNumber, setStudentNumber] = useState('');
    const [collegeName, setCollegeName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [expectedGraduationYear, setExpectedGraduationYear] = useState('');
    const [collegeIdCard, setCollegeIdCard] = useState(null);
    const [idCardPreview, setIdCardPreview] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Get current year for validation
    const currentYear = new Date().getFullYear();
    const graduationYears = [];
    for (let year = currentYear; year <= currentYear + 6; year++) {
        graduationYears.push(year);
    }

    // Handle ID card file upload
    const handleIdCardUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError('ID card image must be less than 5MB');
                return;
            }

            // Validate file type
            if (!file.type.startsWith('image/')) {
                setError('Please upload a valid image file');
                return;
            }

            // Convert to base64
            const reader = new FileReader();
            reader.onloadend = () => {
                setCollegeIdCard(reader.result);
                setIdCardPreview(reader.result);
                setError('');
            };
            reader.readAsDataURL(file);
        }
    };

    // Validate graduation year on change
    const handleGraduationYearChange = (e) => {
        const year = parseInt(e.target.value);
        setExpectedGraduationYear(e.target.value);

        if (year < currentYear) {
            setError('⚠️ You cannot register with a past graduation year. This app is only for current students.');
        } else {
            setError('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Client-side validation
        if (!collegeIdCard) {
            setError('Please upload your college ID card');
            return;
        }

        if (!expectedGraduationYear) {
            setError('Please select your expected graduation year');
            return;
        }

        const gradYear = parseInt(expectedGraduationYear);
        if (gradYear < currentYear) {
            setError('Registration denied: This app is only for current students. Your graduation year indicates you have already passed out.');
            return;
        }

        try {
            setLoading(true);
            await authService.register({
                name,
                email,
                password,
                studentNumber,
                collegeName,
                phoneNumber,
                expectedGraduationYear: gradYear,
                collegeIdCard: {
                    image: collegeIdCard
                }
            });
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col relative z-20">
            <div className="fixed inset-0 bg-gradient-to-br from-indigo-900/80 via-purple-900/80 to-pink-900/80 backdrop-blur-sm z-0"></div>
            <Navbar />
            <div className="flex-grow flex items-center justify-center p-6 relative z-10">
                <div className="w-full max-w-lg">
                    <div className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full border border-white/50">
                        <div className="text-center mb-6">
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
                            <p className="text-gray-500">Join the UniPool community today.</p>
                            <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                                <p className="text-blue-700 text-sm font-medium flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Only for current college students
                                </p>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg shadow-sm" role="alert">
                                <p className="font-bold">⚠️ Error</p>
                                <p>{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-gray-50 focus:bg-white"
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Student Number & College */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Student Number</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-gray-50 focus:bg-white"
                                        placeholder="e.g. 2021CS001"
                                        value={studentNumber}
                                        onChange={(e) => setStudentNumber(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Graduation Year</label>
                                    <select
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-gray-50 focus:bg-white"
                                        value={expectedGraduationYear}
                                        onChange={handleGraduationYearChange}
                                        required
                                    >
                                        <option value="">Select Year</option>
                                        {graduationYears.map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* College Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">College Name</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-gray-50 focus:bg-white"
                                    placeholder="Enter your college name"
                                    value={collegeName}
                                    onChange={(e) => setCollegeName(e.target.value)}
                                    required
                                />
                            </div>

                            {/* College ID Card Upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    College ID Card <span className="text-red-500">*</span>
                                </label>
                                <div className={`relative border-2 border-dashed rounded-xl p-4 transition-all ${idCardPreview
                                        ? 'border-green-400 bg-green-50'
                                        : 'border-gray-300 bg-gray-50 hover:border-primary-400 hover:bg-primary-50'
                                    }`}>
                                    {idCardPreview ? (
                                        <div className="relative">
                                            <img
                                                src={idCardPreview}
                                                alt="ID Card Preview"
                                                className="w-full h-32 object-contain rounded-lg"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCollegeIdCard(null);
                                                    setIdCardPreview(null);
                                                }}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                                            >
                                                ×
                                            </button>
                                            <p className="text-center text-green-600 text-sm mt-2 font-medium">
                                                ✓ ID Card uploaded
                                            </p>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center cursor-pointer">
                                            <svg className="w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span className="text-gray-600 text-sm font-medium">Upload College ID Card</span>
                                            <span className="text-gray-400 text-xs mt-1">PNG, JPG up to 5MB</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleIdCardUpload}
                                                className="hidden"
                                            />
                                        </label>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    📌 Upload a clear photo of your college ID card showing your name and student number
                                </p>
                            </div>

                            {/* Phone Number */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                <input
                                    type="tel"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-gray-50 focus:bg-white"
                                    placeholder="e.g. 9876543210"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-gray-50 focus:bg-white"
                                    placeholder="student@university.edu"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <input
                                    type="password"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-gray-50 focus:bg-white"
                                    placeholder="At least 6 characters"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-3.5 rounded-xl font-bold shadow-lg transition duration-200 mt-2 flex items-center justify-center gap-2 ${loading
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 hover:shadow-emerald-500/30'
                                    }`}
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                                        Creating Account...
                                    </>
                                ) : (
                                    <>
                                        🎓 Sign Up as Student
                                    </>
                                )}
                            </button>
                        </form>

                        <p className="mt-6 text-center text-gray-600">
                            Already have an account? <Link to="/login" className="text-primary-600 font-bold hover:underline">Login</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
