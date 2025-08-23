export default function TestStyling() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-4xl font-bold text-gray-900 text-center mb-8">
          🎉 TAILWIND CSS WORKING!
        </h1>
        
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h2 className="text-2xl font-semibold text-green-600 mb-4">
            ✅ Styling Test Results
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-red-500 text-white p-4 rounded-lg">
              <h3 className="font-bold">Red Background</h3>
              <p className="text-sm opacity-90">bg-red-500</p>
            </div>
            
            <div className="bg-blue-500 text-white p-4 rounded-lg">
              <h3 className="font-bold">Blue Background</h3>
              <p className="text-sm opacity-90">bg-blue-500</p>
            </div>
            
            <div className="bg-green-500 text-white p-4 rounded-lg">
              <h3 className="font-bold">Green Background</h3>
              <p className="text-sm opacity-90">bg-green-500</p>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <p className="text-gray-700">
              <span className="font-semibold text-purple-600">Padding:</span> p-4, p-6, p-8 ✅
            </p>
            <p className="text-gray-700">
              <span className="font-semibold text-purple-600">Margins:</span> mx-auto, mb-4, mt-6 ✅
            </p>
            <p className="text-gray-700">
              <span className="font-semibold text-purple-600">Colors:</span> text-gray-900, text-green-600 ✅
            </p>
            <p className="text-gray-700">
              <span className="font-semibold text-purple-600">Layout:</span> grid, flex, space-y-6 ✅
            </p>
            <p className="text-gray-700">
              <span className="font-semibold text-purple-600">Effects:</span> shadow-lg, rounded-xl ✅
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-center space-x-4">
          <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
            Button Test
          </button>
          <button className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors">
            Secondary Button
          </button>
        </div>
      </div>
    </div>
  )
}