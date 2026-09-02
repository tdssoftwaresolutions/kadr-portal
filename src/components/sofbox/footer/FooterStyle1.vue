<template>
  <!-- Footer -->
  <footer class="bg-white iq-footer">
    <div class="container-fluid">
      <div class="row">
        <div class="col-6">
          <ul class="list-inline mb-0">
            <slot name="left"></slot>
          </ul>
        </div>
        <div class="col-6 text-end">
          <slot name="right"></slot>
        </div>
      </div>
    </div>
  </footer>
  <!-- Footer END -->
</template>
<script>
export default {
  name: 'FooterStyle1'
}
</script>
