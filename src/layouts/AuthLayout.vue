<template>
  <div>
    <Loader />
    <section class="sign-in-page bg-white">
      <div class="container-fluid p-0">
        <div class="row no-gutters">
          <div class="col-12 col-md-6 align-self-center">
            <div class="sign-in-from">
              <div class="auth-language-switcher">
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary"
                  @click="toggleLocale"
                >
                  <i class="ri-translate-2 mr-1"></i>
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
                  <h4 class="mb-1 text-white">Resolve disputes peacefully</h4>
                  <p>Connect with certified mediators to settle cases outside court — faster, confidential, and impartial.</p>
                </div>
                <div class="item">
                  <img :src="require('../assets/images/login/1.png')" class="img-fluid mb-4" alt="Mediation platform">
                  <h4 class="mb-1 text-white">Track your case progress</h4>
                  <p>Schedule meetings, sign agreements, and communicate securely — all in one place.</p>
                </div>
                <div class="item">
                  <img :src="require('../assets/images/login/1.png')" class="img-fluid mb-4" alt="Trusted mediation">
                  <h4 class="mb-1 text-white">Trusted by clients and mediators</h4>
                  <p>Kadr.live is India's platform for online mediation and dispute resolution.</p>
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
        this.$i18n.locale = this.$i18n.locale === 'en' ? 'hi' : 'en'
        this.$forceUpdate()
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
</style>
