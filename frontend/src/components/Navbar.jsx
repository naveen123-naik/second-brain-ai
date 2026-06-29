import { Link } from "react-router-dom";

function Navbar() {
  return (
    <div style={{ background: "#222", padding: "10px" }}>

      <Link to="/" style={{ color: "white", margin: "10px" }}>
        Dashboard
      </Link>

      <Link to="/upload" style={{ color: "white", margin: "10px" }}>
        Upload
      </Link>

      <Link to="/chat" style={{ color: "white", margin: "10px" }}>
        Chat
      </Link>



      <Link to="/calendar" style={{ color: "white", margin: "10px" }}>
        Calendar
      </Link>

      <Link to="/voice" style={{ color: "white", margin: "10px" }}>
        Voice
      </Link>

    </div>
  );
}

export default Navbar;