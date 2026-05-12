import Navbar from '../components/Navbar';
import HeroCarousel from '../components/HeroCarousel';
import RecentProjects from '../components/RecentProjects';
import Gallery from '../components/TVShow';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar variant="home" />
      <main className="pt-14">
        <div className="px-4 md:px-6 pt-6">
          <HeroCarousel />
        </div>
        <RecentProjects />
        <Gallery />
      </main>
    </div>
  );
}
