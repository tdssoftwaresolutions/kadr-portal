<template>
  <b-container fluid>
    <b-row>
      <b-col lg="6">
        <iq-card>
          <template v-slot:headerTitle>
            <h4 class="card-title">Basic Checkbox</h4>
          </template>
          <template v-slot:body>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi vulputate, ex ac venenatis mollis, diam nibh finibus leo</p>
            <div class="checkbox d-inline-block ms-2" v-for="(item,index) in state" :key="index">
              <input type="checkbox" class="checkbox-input" :id="`basic-checkbox-${index}`" v-model="item.checked" :disabled="item.disabled">
              <label :for="`basic-checkbox-${index}`" class="ms-2">{{ item.label }}</label>
            </div>
          </template>
        </iq-card>
      </b-col>
      <b-col lg="6">
        <iq-card>
          <template v-slot:headerTitle>
            <h4 class="card-title">Custom Checkbox</h4>
          </template>
          <template v-slot:body>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi vulputate, ex ac venenatis mollis, diam nibh finibus leo</p>
            <template v-for="(item,index) in state">
              <b-checkbox class="custom-switch-color" :color="item.color" v-model="item.checked" :disabled="item.disabled" name="check-button" inline :key="index">
                {{ item.label }}
              </b-checkbox>
            </template>
          </template>
        </iq-card>
      </b-col>
      <b-col lg="6">
        <iq-card>
          <template v-slot:headerTitle>
            <h4 class="card-title">Custom Color</h4>
          </template>
          <template v-slot:body>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi vulputate, ex ac venenatis mollis, diam nibh finibus leo</p>
            <template v-for="(item,index) in color">
              <b-checkbox v-model="item.checked" class="custom-checkbox-color" :color="item.color" :disabled="item.disabled" name="check-button" inline :key="index">
                {{ item.label }}
              </b-checkbox>
            </template>
          </template>
        </iq-card>
      </b-col>
      <b-col lg="6">
        <iq-card>
          <template v-slot:headerTitle>
            <h4 class="card-title">Color</h4>
          </template>
          <template v-slot:body>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi vulputate, ex ac venenatis mollis, diam nibh finibus leo</p>
            <template v-for="(item,index) in color">
              <b-checkbox v-model="item.checked" class="custom-checkbox-color-check" :color="item.color" :disabled="item.disabled" name="check-button" inline :key="index">
                {{ item.label }}
              </b-checkbox>
            </template>
          </template>
        </iq-card>
      </b-col>
      <b-col lg="6">
        <iq-card>
          <template v-slot:headerTitle>
            <h4 class="card-title">Boolean Checkbox</h4>
          </template>
          <template v-slot:body>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi vulputate, ex ac venenatis mollis, diam nibh finibus leo</p>
            <template v-for="(item,index) in bool">
              <b-checkbox v-model="item.checked" :disabled="item.disabled" name="check-button" inline :key="index">
                {{ item.label }}
              </b-checkbox>
            </template>
          </template>
        </iq-card>
      </b-col>
      <b-col lg="6">
        <iq-card>
          <template v-slot:headerTitle>
            <h4 class="card-title">Change Icon</h4>
          </template>
          <template v-slot:body>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi vulputate, ex ac venenatis mollis, diam nibh finibus leo</p>
            <template v-for="(item,index) in icon">
              <div class="form-check custom-checkbox checkbox-icon custom-control-inline" :key="index">
                <input type="checkbox" class="custom-control-input" :id="`customSwitch-1-${index}`" v-model="item.checked">
                <label class="custom-control-label" :for="`customSwitch-1-${index}`" v-html="item.label"></label>
              </div>
            </template>
          </template>
        </iq-card>
      </b-col>
    </b-row>
  </b-container>
</template>
<script>
import { sofbox } from '../../config/pluginInit'

export default {
  name: 'FormCheckboxes',
  mounted () {
    sofbox.index()
  },
  data () {
    return {
      state: [
        {
          label: 'False/Inactive',
          checked: false,
          disabled: false
        },
        {
          label: 'True/Active',
          checked: true,
          disabled: false
        },
        {
          label: 'Disabled/Active',
          checked: true,
          disabled: true
        },
        {
          label: 'Disabled/Inactive',
          checked: false,
          disabled: true
        }
      ],
      text: [
        {
          activeLabel: 'On',
          inactiveLabel: 'Off',
          label: 'Primary',
          class: 'primary',
          checked: true
        },
        {
          activeLabel: 'True',
          inactiveLabel: 'False',
          label: 'Success',
          class: 'success',
          checked: true
        },
        {
          activeLabel: 'Yes',
          inactiveLabel: 'No',
          label: 'Danger',
          class: 'danger',
          checked: true
        }
      ],
      color: [
        {
          label: 'Primary',
          color: 'primary',
          checked: false
        },
        {
          label: 'Success',
          color: 'success',
          checked: true
        },
        {
          label: 'Danger',
          color: 'danger',
          checked: true
        },
        {
          label: 'Warning',
          color: 'warning',
          checked: false
        },
        {
          label: 'Dark',
          color: 'dark',
          checked: true
        },
        {
          label: 'Info',
          color: 'info',
          checked: false
        }
      ],
      icon: [
        {
          label: '<i class="fa fa-music"></i> Music',
          checked: true
        },
        {
          label: '<i class="fa fa-commenting-o"></i> SMS',
          checked: true
        },
        {
          label: '<i class="fa fa-times"></i> Cancle',
          checked: true
        },
        {
          label: '<i class="fa fa-file"></i> File',
          checked: true
        },
        {
          label: '<i class="fa fa-bold"></i> Bold',
          checked: true
        },
        {
          label: '<i class="fa fa-map-marker"></i> Location',
          checked: true
        },
        {
          label: '<i class="fa fa-camera"></i> Camera',
          checked: true
        }
      ],
      bool: [
        {
          label: 'True',
          checked: true
        },
        {
          label: 'False',
          checked: false
        }
      ]
    }
  }
}
</script>
