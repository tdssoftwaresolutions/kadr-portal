<template>
  <div>
    <img src="https://dummyimage.com/88x88/000/fff" alt="user-image" class="rounded-circle">
    <h4 class="mt-3 mb-0">Hi ! Michael Smith</h4>
    <p>Enter your password to access the admin.</p>
    <form class="mt-4">

      <div class="mb-3">
        <label for="exampleInputEmail1">Password</label>
        <input type="Password" class="form-control mb-0" id="exampleInputEmail1" aria-describedby="emailHelp" placeholder="Password">
      </div>

      <div class="d-inline-block w-100">
        <button type="submit" class="btn btn-primary float-right">Log In</button>
      </div>

    </form>
  </div>
</template>
<script>
export default {
  name: 'LockScreen1'
}
</script>
