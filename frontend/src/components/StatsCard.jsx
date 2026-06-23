function StatsCard({ title, value }) {
  return (
    <div className="bg-white shadow rounded p-6">

      <h2 className="text-gray-500">
        {title}
      </h2>

      <p className="text-2xl font-bold">
        {value}
      </p>

    </div>
  )
}

export default StatsCard