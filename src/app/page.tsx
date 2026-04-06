import LocationsSection from "@/components/LocationsSection";
import SubmitForm from "@/components/SubmitForm";

export default function Home() {
  return (
    <div className="page">
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">MySkyView</p>
          <h1>Pin your calm sky moments from anywhere.</h1>
          <p className="hero-subtitle">
            Upload a sky photo with a title. We extract GPS coordinates from image
            metadata, optimize the image for web, and place it straight on your map.
          </p>
          <div className="hero-actions">
            <a className="primary-button" href="#submit">
              Add a sky view
            </a>
            <a className="ghost-button" href="#map">
              Open map
            </a>
          </div>
        </div>

        <div className="hero-panel">
          <h3>How it works</h3>
          <ol>
            <li>Take a photo on your phone with location metadata enabled.</li>
            <li>Upload it here with a short title.</li>
            <li>See it pinned on your personal sky map.</li>
          </ol>
        </div>
      </header>

      <div id="map">
        <LocationsSection />
      </div>

      <section id="submit" className="section submit">
        <div className="section-header">
          <h2>Add a new sky view</h2>
          <p>Images are processed to max 800px wide and originals are deleted.</p>
        </div>
        <SubmitForm />
      </section>

      <footer className="footer">
        <p>MySkyView - personal sky tracking with EXIF GPS map pins</p>
      </footer>
    </div>
  );
}