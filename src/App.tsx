import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import TvDisplay from "./routes/TvDisplay";
import DonationDisplay from "./routes/DonationDisplay";
import { loadAdminPanelRoute } from "./routes/routeLoaders";

const AdminPanel = lazy(loadAdminPanelRoute);

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<TvDisplay />} />
      <Route path="/tv" element={<TvDisplay />} />
      <Route path="/donation" element={<DonationDisplay />} />
      <Route
        path="/admin"
        element={(
          <Suspense
            fallback={(
              <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:px-6 sm:py-8">
                <section className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                    Yönetim Paneli
                  </p>
                  <h1 className="mt-2 text-2xl font-bold text-slate-950">Yönetim paneli yükleniyor</h1>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Yönetim arayüzü hazırlanıyor.
                  </p>
                </section>
              </main>
            )}
          >
            <AdminPanel />
          </Suspense>
        )}
      />
    </Routes>
  );
}
