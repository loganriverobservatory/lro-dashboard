<script setup lang="ts">
// You can import any icons or extra components here later
</script>

<template>
  <div class="help-container">
    <div class="help-card">
      <h1>Dashboard Help</h1>

      <div class="faq-section">
        <h2>Navigating the Views</h2>
        <ul>
          <li>
            <strong>List View:</strong> See all active stations and their latest metrics in a
            sortable table.
          </li>
          <li>
            <strong>Map View:</strong> Click on any red pin to see real-time discharge data for that
            specific location.
          </li>
          <li>
            <strong>Schematic View:</strong> View the river system's logical flow and station
            hierarchy.
          </li>
        </ul>

        <h2>Data Questions?</h2>
        <p>
          If you have questions about processing levels or sensor health, please visit the main
          HydroServer portal by clicking in the upper right corner.
        </p>
        <h2>Contact Us: Feedback/Questions</h2>
        <p>
          If you have questions or want to report an issue/feedback about the data or your
          experience with this dashboard, please fill out our support form.
        </p>

        <a
          href="https://docs.google.com/forms/d/e/1FAIpQLSexPH7rOe9UwZWmd6GAuIaIhHMv3sBDEHWd5u4luZWZTK2Lwg/viewform?usp=sharing&ouid=115392247305093314301"
          target="_blank"
          rel="noopener noreferrer"
          class="form-link-btn"
        >
          Click here for form.
        </a>

        <h2>Want to Learn More?</h2>
        <p>Explore other Resources:</p>
        <ul>
          <li>
            <strong>Logan River Observatory (LRO):</strong>
            <a
              href="https://uwrl.usu.edu/lro/"
              target="_blank"
              rel="noopener noreferrer"
              class="form-link-btn"
            >
              Visit the LRO Website
            </a>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.help-container {
  padding: 2rem;
  height: 100%;
  overflow-y: auto; /* Ensures it scrolls nicely on mobile */
  background-color: #f8f9fa; /* Matches your map background */
}

.help-card {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

h1 {
  color: #0f172a;
  margin-top: 0;
}

h2 {
  color: #334155;
  margin-top: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0.5rem;
}

ul {
  line-height: 1.6;
  color: #475569;
}
</style>
