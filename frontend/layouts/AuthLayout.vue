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
              <div class="owl-carousel" data-autoplay="true" data-loop="true" data-nav="false" data-dots="true" data-items="1" data-items-laptop="1" data-items-tab="1" data-items-mobile="1" data-items-mobile-sm="1" data-margin="0">
                <div class="item">
                  <img :src="require('../assets/images/login/1.png')" class="img-fluid mb-4" alt="logo">
                  <h4 class="mb-1 text-white">{{ $t('auth.carousel.slide1Title') }}</h4>
                  <p>{{ $t('auth.carousel.slide1Body') }}</p>
                </div>
                <div class="item">
                  <img :src="require('../assets/images/login/1.png')" class="img-fluid mb-4" alt="Mediation platform">
                  <h4 class="mb-1 text-white">{{ $t('auth.carousel.slide2Title') }}</h4>
                  <p>{{ $t('auth.carousel.slide2Body') }}</p>
                </div>
                <div class="item">
                  <img :src="require('../assets/images/login/1.png')" class="img-fluid mb-4" alt="Trusted mediation">
                  <h4 class="mb-1 text-white">{{ $t('auth.carousel.slide3Title') }}</h4>
                  <p>{{ $t('auth.carousel.slide3Body') }}</p>
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
export default {
  name: 'AuthLayout',
  components: {
    Loader
  },
  mounted () {
    sofbox.index()
  },
  data () {
    return {
      logo,
      bgImageURL: bgImage
    }
  },
  methods: {
    toggleLocale () {
      if (this.$i18n) {
        this.$i18n.setLocale(this.$i18n.locale === 'en' ? 'hi' : 'en')
      }
    }
  }
}
</script>
<style>
@import "~owl.carousel/dist/assets/owl.carousel.min.css";
@import "~owl.carousel/dist/assets/owl.theme.default.min.css";

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
