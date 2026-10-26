<template>
  <div>
    <Loader />
    <section class="sign-in-page bg-white">
      <div class="container-fluid p-0">
        <div class="row g-0">
          <div class="col-12 col-md-6 auth-form-col">
            <div class="sign-in-from auth-form-inner">
              <div class="auth-language-switcher">
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary"
                  @click="toggleLocale"
                >
                  <i class="ri-translate-2 me-1"></i>
                  {{ $i18n.locale === 'hi' ? 'English' : 'हिन्दी' }}
                </button>
              </div>
              <router-view></router-view>
            </div>
          </div>
          <div class="col-12 col-md-6 text-center" style="height: 100vh;">
            <div class="sign-in-detail text-white" :style="'background: url('+bgImageURL+') no-repeat 0 0; background-size: cover;'">
              <a class="sign-in-logo mb-5" href="#" style="color:white;font-size:2rem;"><img style="margin-right:0.4rem;" :src="logo" class="img-fluid" alt="logo">KADR.live</a>
              <div class="auth-carousel" @mouseenter="stopCarousel" @mouseleave="startCarousel">
                <div class="auth-carousel-track" :style="{ transform: `translateX(-${activeSlide * 100}%)` }">
                  <div v-for="(slide, i) in slides" :key="i" class="item" :aria-hidden="i !== activeSlide">
                    <img :src="slideImage" class="img-fluid mb-4" :alt="slide.alt">
                    <h4 class="mb-1 text-white">{{ $t(slide.title) }}</h4>
                    <p>{{ $t(slide.body) }}</p>
                  </div>
                </div>
                <div class="auth-carousel-dots">
                  <button
                    v-for="(slide, i) in slides"
                    :key="i"
                    type="button"
                    :class="['auth-carousel-dot', { active: i === activeSlide }]"
                    :aria-label="`Slide ${i + 1}`"
                    @click="activeSlide = i"
                  ><span></span></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
<script>
import Loader from '../components/sofbox/loader/Loader.vue'
import logo from '../assets/images/logo.png'
import { sofbox } from '../config/pluginInit'
import bgImage from '../assets/images/login/2.jpg'
import slideImage from '../assets/images/login/1.png'

const CAROUSEL_INTERVAL_MS = 5000
export default {
  name: 'AuthLayout',
  components: {
    Loader
  },
  mounted () {
    sofbox.index()
    this.startCarousel()
  },
  beforeUnmount () {
    this.stopCarousel()
  },
  data () {
    return {
      logo,
      bgImageURL: bgImage,
      slideImage,
      activeSlide: 0,
      carouselTimer: null,
      slides: [
        { title: 'auth.carousel.slide1Title', body: 'auth.carousel.slide1Body', alt: 'logo' },
        { title: 'auth.carousel.slide2Title', body: 'auth.carousel.slide2Body', alt: 'Mediation platform' },
        { title: 'auth.carousel.slide3Title', body: 'auth.carousel.slide3Body', alt: 'Trusted mediation' }
      ]
    }
  },
  methods: {
    startCarousel () {
      this.stopCarousel()
      this.carouselTimer = setInterval(() => {
        this.activeSlide = (this.activeSlide + 1) % this.slides.length
      }, CAROUSEL_INTERVAL_MS)
    },
    stopCarousel () {
      if (this.carouselTimer) clearInterval(this.carouselTimer)
      this.carouselTimer = null
    },
    toggleLocale () {
      if (this.$i18n) {
        this.$i18n.setLocale(this.$i18n.locale === 'en' ? 'hi' : 'en')
      }
    }
  }
}
</script>
<style>
/* Sign-in page slider (replaces the jQuery owl.carousel plugin). */
.auth-carousel {
  overflow: hidden;
  position: relative;
}

.auth-carousel-track {
  display: flex;
  transition: transform 0.6s ease;
}

.auth-carousel-track .item {
  flex: 0 0 100%;
  min-width: 0;
}

.auth-carousel-track .item img {
  display: inline-block;
}

.auth-carousel-dots {
  margin-top: 20px;
  text-align: center;
}

.auth-carousel-dot {
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
}

.auth-carousel-dot span {
  background: #ffffff;
  display: inline-block;
  border-radius: 30px;
  margin: 0 5px;
  height: 8px;
  width: 8px;
  transition: all 0.3s ease-in-out;
}

.auth-carousel-dot.active span {
  box-shadow: 0 0 0 6px rgba(255, 255, 255, 0.2);
}

@media (prefers-reduced-motion: reduce) {
  .auth-carousel-track { transition: none; }
}

.auth-language-switcher {
  position: absolute;
  top: 1rem;
  right: 1.5rem;
  z-index: 10;
}

.auth-language-switcher .btn {
  font-size: 0.8rem;
  padding: 0.3rem 0.7rem;
  border-radius: 20px;
}

/* Fit the form column to the viewport so the page itself never scrolls;
   the inner form area handles any overflow on its own. */
.auth-form-col {
  height: 100vh;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.auth-form-inner {
  width: 100%;
  max-height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-top: 3rem;
  padding-bottom: 1.5rem;
}

/* Tame the very large default side padding so wider two-column forms fit
   comfortably without horizontal cramping. */
@media (min-width: 992px) {
  .auth-form-inner.sign-in-from {
    padding-left: 4rem;
    padding-right: 4rem;
  }
}

@media (max-width: 767.98px) {
  .auth-form-col {
    height: auto;
    overflow: visible;
  }
  .auth-form-inner {
    max-height: none;
    overflow: visible;
  }
}
</style>
