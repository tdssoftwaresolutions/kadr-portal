<template>
  <div>
    <Loader />
    <section class="sign-in-page bg-white">
      <div class="container-fluid p-0">
        <div class="row no-gutters">
          <div class="col-12 col-md-6 align-self-center">
            <div class="sign-in-from">
              <router-view></router-view>
            </div>
          </div>
          <div class="col-12 col-md-6 text-center">
            <div class="sign-in-detail text-white" :style="'background: url('+bgImageURL+') no-repeat 0 0; background-size: cover;'">
              <a class="sign-in-logo mb-5" href="#" style="color:white;font-size:2rem;"><img style="margin-right:0.4rem;" :src="logo" class="img-fluid" alt="logo">KADR.live</a>
              <div class="owl-carousel" data-autoplay="true" data-loop="true" data-nav="false" data-dots="true" data-items="1" data-items-laptop="1" data-items-tab="1" data-items-mobile="1" data-items-mobile-sm="1" data-margin="0">
                <div class="item">
                  <img :src="require('../assets/images/login/1.png')" class="img-fluid mb-4" alt="logo">
                  <h4 class="mb-1 text-white">Manage your orders</h4>
                  <p>It is a long established fact that a reader will be distracted by the readable content.</p>
                </div>
                <div class="item">
                  <img :src="require('../assets/images/login/1.png')" class="img-fluid mb-4" alt="logo">
                  <h4 class="mb-1 text-white">Manage your orders</h4>
                  <p>It is a long established fact that a reader will be distracted by the readable content.</p>
                </div>
                <div class="item">
                  <img :src="require('../assets/images/login/1.png')" class="img-fluid mb-4" alt="logo">
                  <h4 class="mb-1 text-white">Manage your orders</h4>
                  <p>It is a long established fact that a reader will be distracted by the readable content.</p>
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
  }
}
</script>
