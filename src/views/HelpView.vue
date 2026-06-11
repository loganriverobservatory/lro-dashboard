<script setup lang="ts">
/*
Help page and other resources - Stylized to match HomeView branding
*/
</script>

<template>
  <div class="help-container">
    <div class="help-card">
      <h2 class="hero-title main-help-title">Dashboard Help</h2>

      <div class="faq-section">
        <h2 class="hero-title">Navigating the Views</h2>
        <ul class="hero-subtitle list-content">
          <li>
            <strong>List View:</strong> See all active stations and their latest metrics in a
            sortable table.
          </li>
          <li>
            <strong>Map View:</strong> Click on any pin to see real-time discharge data for that
            specific location.
          </li>
          <li>
            <strong>Schematic View:</strong> View the river system's logical flow and station
            hierarchy.
          </li>
        </ul>

        <h2 class="hero-title">Data Questions?</h2>
        <p class="hero-subtitle">
          If you have questions about processing levels or sensor health, please visit the main
          HydroServer portal by clicking in the upper right corner icon.
        </p>

        <h2 class="hero-title">Contact Us: Feedback/Questions</h2>
        <p class="hero-subtitle">
          If you have questions or want to report an issue/feedback about your experience with this
          dashboard, please fill out our support form.
        </p>

        <p class="hero-subtitle link-wrapper">
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSexPH7rOe9UwZWmd6GAuIaIhHMv3sBDEHWd5u4luZWZTK2Lwg/viewform?usp=sharing&ouid=115392247305093314301"
            target="_blank"
            rel="noopener noreferrer"
            class="form-link-btn"
          >
            Click here for form.
          </a>
        </p>

        <h2 class="hero-title">Want to Learn More?</h2>
        <ul class="hero-subtitle list-content">
          <li>
            <strong>Logan River Observatory (LRO):</strong>
            <a
              href="https://uwrl.usu.edu/lro/"
              target="_blank"
              rel="noopener noreferrer"
              class="form-link-btn inline-link"
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
/* Core Container & Typography Alignment */
.help-container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  width: 100%;
  max-width: 1440px;
  margin: 0;
  padding: 2.5rem 3rem 4rem 2.5rem;
  box-sizing: border-box;
}

.help-card {
  max-width: 820px;
  margin: 0;
  text-align: left;
}

.faq-section {
  margin-top: 1.5rem;
}

.hero-title {
  font-size: 1.45rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.025em;
  margin: 2.25rem 0 0.75rem 0;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0.5rem;
}

.main-help-title {
  font-size: 1.85rem;
  margin-top: 0;
}

.hero-subtitle {
  font-size: 1.08rem;
  color: #475569;
  line-height: 1.6;
  margin: 0 0 1rem 0;
  max-width: 820px;
}

.list-content {
  padding-left: 1.25rem;
  margin-bottom: 1.5rem;
}

.list-content li {
  margin-bottom: 0.5rem;
}

.link-wrapper {
  margin-top: 0.75rem;
}

.form-link-btn {
  font-size: 1.02rem;
  font-weight: 700;
  color: #2563eb;
  text-decoration: underline;
  text-underline-offset: 4px;
  transition: color 0.22s ease;
  cursor: pointer;
}

.form-link-btn:hover {
  color: #1d4ed8;
}

.inline-link {
  margin-left: 6px;
  font-size: 1.08rem;
}
</style>
