# Quotes for it API

This is a simple README.md template for a Node.js application using pm2 and ecosystem.config.js.

## Installation

1. Clone the repository:
   ```bash
   git clone

2. Navigate to the project directory:
    ```bash
    cd <project-directory>
3. Install dependencies:
    ```bash
    npm install

# Usage
Start the application using pm2:

   ```bash
   pm2 start ecosystem.config.js --env {uat|production}
   ```

To monitor logs:

```
pm2 logs
```

To stop the application:
```
pm2 stop ecosystem.config.js
```