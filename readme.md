# Pinterest Scraper

A Node.js web application for collecting and processing Pinterest streaming URLs with priority ordering.

## Overview
This application provides a user-friendly interface to submit multiple Pinterest streaming URLs in priority order.  
The first URL entered is considered the highest priority, with subsequent URLs assigned lower priority.

## Features
- **User-friendly Interface**: Clean, modern design with gradient background and floating decorative elements  
- **Dynamic URL Management**: Add or remove URL fields as needed  
- **Priority Ordering**: URLs are automatically numbered to indicate their priority level  
- **Form Validation**: Ensures all required fields are completed with valid URLs  
- **Responsive Design**: Works well on both desktop and mobile devices  
- **Node.js Backend**: Express server handles form submissions  

## Project Structure
```
project/
│── assets/
│   └── wallpaper/
│       ├── LiveWallpapers/
│       └── StaticWallpapers/
│
│── routes/
│   └── scrape.js
│
│── services/
│   ├── scraper.js
│   ├── downloader.js
│   └── video.js
│
│── utils/
│   └── fileUtils.js
│
│── index.js   <-- main entry (starts server)
│── package.json

```

## Installation
1. Clone or download the project files  
2. Navigate to the project directory  
3. Install dependencies:
   ```bash
   npm install
   ```

## Usage
Start the server:
```bash
npm start
```
or
```bash
node index.js
```

Open your browser and go to:  
👉 [http://localhost:3000](http://localhost:3000)

### Steps
1. Enter your name in the provided field  
2. Add one or more Pinterest streaming URLs:  
   - The first URL field is pre-populated  
   - Click **"Add Another URL"** to include additional URLs  
   - Use the **"Remove"** button to delete URLs (except the first one)  
3. Click **"Submit Links"** to send the data to the server  

## API Endpoint
The application provides a backend endpoint at `/scrape` that accepts `POST` requests with JSON data:

```json
{
  "name": "User's Name",
  "urls": ["url1", "url2", "url3"]
}
```

## Dependencies
- [Express.js](https://expressjs.com/) - Web framework for Node.js  

(Other dependencies are listed in your `package.json`)

## Development
To modify the application:
- Edit `index.html` for structural changes  
- Update `assets/css/styles.css` for styling changes  
- Modify `assets/js/script.js` for client-side functionality  
- Adjust `index.js` for server-side logic  

## Browser Compatibility
Compatible with modern browsers that support:
- ES6 JavaScript  
- CSS Flexbox  
- HTML5 form validation  

## License
This project is open source and available under the **MIT License**.
