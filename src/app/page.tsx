import Link from "next/link";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-4">Band Parts</h1>
        <p className="text-lg text-gray-600 mb-12">vox / instrumental parts.</p>

        <div className="grid gap-6 md:grid-cols-2">
          <Link
            href="/songs"
            className="block p-8 border rounded-lg hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-2">Songs</h2>
            <p className="text-gray-600">all parts per song</p>
          </Link>

          <Link
            href="/members"
            className="block p-8 border rounded-lg hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-2">Members</h2>
            <p className="text-gray-600">all parts per member</p>
          </Link>

          {/* <Link
            href="/admin"
            className="block p-8 border rounded-lg hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-2">Admin</h2>
            <p className="text-gray-600">Manage content</p>
          </Link> */}
        </div>
      </div>
    </div>
  );
}
