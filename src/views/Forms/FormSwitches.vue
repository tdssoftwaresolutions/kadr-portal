<template>
  <b-container fluid>
    <b-row>
      <b-col lg="12">
        <iq-card>
          <template v-slot:headerTitle>
            <h4 class="card-title">State</h4>
          </template>
          <template v-slot:body>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi vulputate, ex ac venenatis mollis, diam nibh finibus leo</p>
            <template v-for="(item,index) in state">
              <b-form-checkbox v-model="item.checked" :disabled="item.disabled" name="check-button" switch inline :key="index">
                {{ item.label }}
              </b-form-checkbox>
            </template>
          </template>
        </iq-card>
      </b-col>
      <b-col lg="12">
        <iq-card>
          <template v-slot:headerTitle>
            <h4 class="card-title">Text</h4>
          </template>
          <template v-slot:body>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi vulputate, ex ac venenatis mollis, diam nibh finibus leo</p>
            <template v-for="(item,index) in text">
              <div class="form-check custom-switch custom-switch-text custom-control-inline custom-switch-color" :key="index">
                <div class="custom-switch-inner">
                  <p class="mb-0"> {{ item.label }} </p>
                  <input type="checkbox" class="custom-control-input" :class="'bg-'+item.class" :id="'customSwitch-11'+index" v-model="item.checked">
                  <label class="custom-control-label" :for="'customSwitch-11'+index" :data-on-label="item.activeLabel" :data-off-label="item.inactiveLabel">
                  </label>
                </div>
              </div>
            </template>
          </template>
        </iq-card>
      </b-col>
      <b-col lg="12">
        <iq-card>
          <template v-slot:headerTitle>
            <h4 class="card-title">Color</h4>
          </template>
          <template v-slot:body>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi vulputate, ex ac venenatis mollis, diam nibh finibus leo</p>
            <template v-for="(item,index) in color">
              <b-form-checkbox class="custom-switch-color" :color="item.color" v-model="item.checked" :disabled="item.disabled" name="check-button" switch inline :key="index">
                {{ item.label }}
              </b-form-checkbox>
            </template>
          </template>
        </iq-card>
      </b-col>
      <b-col lg="12">
        <iq-card>
          <template v-slot:headerTitle>
            <h4 class="card-title">Icon</h4>
          </template>
          <template v-slot:body>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi vulputate, ex ac venenatis mollis, diam nibh finibus leo</p>
            <template v-for="(item,index) in icon">
              <div class="form-check custom-switch custom-switch-icon custom-switch-color custom-control-inline" :key="index">
                <div class="custom-switch-inner">
                  <p class="mb-0"> Primary </p>
                  <input type="checkbox" class="custom-control-input" :class="`bg-${item.color}`" :id="`customSwitch-1-${index}`" v-model="item.checked">
                  <label class="custom-control-label" :for="`customSwitch-1-${index}`">
                    <span class="switch-icon-left" v-html="item.activeLabel"></span>
                    <span class="switch-icon-right" v-html="item.inactiveLabel"></span>
                  </label>
                </div>
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
  name: 'FormSwitches',
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
          checked: true
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
          checked: true
        },
        {
          label: 'Dark',
          color: 'dark',
          checked: true
        },
        {
          label: 'Info',
          color: 'info',
          checked: true
        }
      ],
      icon: [
        {
          activeLabel: '<i class="fa fa-check"></i>',
          inactiveLabel: '<i class="fa fa-check"></i>',
          label: 'Primary',
          color: 'primary',
          checked: false
        },
        {
          activeLabel: '<i class="fa fa-check"></i>',
          inactiveLabel: '<i class="fa fa-check"></i>',
          label: 'Success',
          color: 'success',
          checked: true
        },
        {
          activeLabel: '<i class="fa fa-times"></i>',
          inactiveLabel: '<i class="fa fa-times"></i>',
          label: 'Warning',
          color: 'warning',
          checked: true
        },
        {
          activeLabel: '<i class="fa fa-exclamation-triangle"></i>',
          inactiveLabel: '<i class="fa fa-exclamation-triangle"></i>',
          label: 'Danger',
          color: 'danger',
          checked: true
        },
        {
          activeLabel: '<i class="fa fa-thumb-tack"></i>',
          inactiveLabel: '<i class="fa fa-thumb-tack"></i>',
          label: 'Dark',
          color: 'dark',
          checked: true
        },
        {
          activeLabel: '<i class="fa fa-info"></i>',
          inactiveLabel: '<i class="fa fa-info"></i>',
          label: 'Info',
          color: 'info',
          checked: true
        }
      ]
    }
  }
}
</script>
