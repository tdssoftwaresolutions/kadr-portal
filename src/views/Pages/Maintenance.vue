<template>
  <div class="mt-5 iq-maintenance">
    <div class="container-fluid p-0">
      <div class="row no-gutters">
        <div class="col-12 text-center">
          <div class="iq-maintenance">
            <img :src="require('../../assets/images/error/02.png')" class="img-fluid" alt="error">
            <h3 class="mt-4 mb-1">We are Currently Performing Maintenance</h3>
            <p>Please check back in sometime.</p>
          </div>
        </div>
      </div>
    </div>
    <div class="container mt-3">
      <div class="row">
        <div class="col-4">
          <div class="card text-center mb-0">
            <div class="card-body">
              <i class="ri-window-line ri-4x line-height text-primary"></i>
              <h5 class="card-title mt-1">Why is the Site Down?</h5>
              <p class="mb-0">It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout.</p>
            </div>
          </div>
        </div>
        <div class="col-4">
          <div class="card text-center mb-0">
            <div class="card-body">
              <i class="ri-time-line ri-4x line-height text-primary"></i>
              <h5 class="card-title mt-1">What is the Downtime?</h5>
              <p class="mb-0">It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout.</p>
            </div>
          </div>
        </div>
        <div class="col-4">
          <div class="card text-center mb-0">
            <div class="card-body">
              <i class="ri-information-line ri-4x line-height text-primary"></i>
              <h5 class="card-title mt-1">Do you need Support?</h5>
              <p class="mb-0">It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import { sofbox } from '../../config/pluginInit'

export default {
  name: 'Maintenance',
  mounted () {
    sofbox.index()
  }
}
</script>
