<template>
  <b-container fluid>
    <RightSideBarStyle1>
      <iq-card class="shadow-none">
        <template v-slot:headerTitle>
          <h6 class="card-title">Active Users</h6>
        </template>
        <template v-slot:headerAction>
          <b-dropdown id="dropdownMenuButton1" right variant="none" data-toggle="dropdown">
            <template v-slot:button-content>
              <span><i class="ri-more-2-fill"></i></span>
            </template>
            <b-dropdown-item><i class="ri-eye-fill ms-2"></i>View</b-dropdown-item>
            <b-dropdown-item><i class="ri-delete-bin-6-fill ms-2"></i>Delete</b-dropdown-item>
            <b-dropdown-item><i class="ri-pencil-fill ms-2"></i>Edit</b-dropdown-item>
            <b-dropdown-item><i class="ri-printer-fill ms-2"></i>Print</b-dropdown-item>
            <b-dropdown-item><i class="ri-file-download-fill ms-2"></i>Download</b-dropdown-item>
          </b-dropdown>
        </template>
        <template v-slot:body>
          <div class="d-flex align-items-center mb-4" v-for="(item,index) in usersList" :key="index">
            <div :class="`iq-profile-avatar ${item.isActive ? `status-online` : 'status-away'}`">
              <img class="rounded-circle avatar-60" :src="item.image" :alt="item.name">
            </div>
            <div class="media-body ms-3">
              <h6 class="mb-0"><a href="#">{{ item.name }}</a></h6>
              <p class="mb-0">{{ item.role }}</p>
            </div>
          </div>
        </template>
      </iq-card>
    </RightSideBarStyle1>
    <b-row class="row-eq-height">
      <b-col lg="4" md="12">
        <iq-card>
          <template v-slot:body>
            <b-row>
              <b-col>
                <h5 class="card-title text-uppercase text-secondary mb-0 d-block">Live Users</h5>
                <h2 class="mb-0 d-block">350</h2>
              </b-col>
              <b-col cols="auto">
                <div class="icon iq-icon-box rounded-circle iq-bg-primary rounded-circle">
                  <i class="ri-add-box-line"></i>
                </div>
              </b-col>
            </b-row>
          </template>
          <ApexChart element="chart-9" :chartOption="chart9" :isLive=true />
        </iq-card>
      </b-col>
      <b-col v-for="(list,index) in lists" :key="index" lg="2" md="6">
        <iq-card class="">
          <template v-slot:body>
            <b-row>
              <b-col lg="12" class="mb-2 d-flex justify-content-between">
                <div :class=" 'iq-bg-'+list.icons.color" class="icon iq-icon-box rounded-circle rounded-circle">
                  <i :class="list.icons.icon"></i>
                </div>
              </b-col>
              <b-col lg="12" class="mt-3">
                <h6 class="card-title text-uppercase text-secondary mb-0">{{ list.title }}</h6>
                <span class="h2 text-dark mb-0 counter">{{ list.number }}</span>
              </b-col>
            </b-row>
            <p class="mb-0 text-muted mt-3">
              <span :class=" 'text-'+list.icons.color" class="ms-2"><i :class="list.arrow"></i> {{ list.percentage }}%</span>
            </p>
          </template>
        </iq-card>
      </b-col>
    </b-row>
    <b-row class="row-eq-height">
      <b-col lg="8" md="12">
        <iq-card class="" body-class="p-0">
          <template v-slot:headerTitle>
            <h4 class="card-title">Analytics</h4>
          </template>
          <template v-slot:headerAction>
            <ul class="nav nav-pills">
              <li class="nav-item">
                <a href="#" class="nav-link active">Days</a>
              </li>
              <li class="nav-item">
                <a href="#" class="nav-link">Weeks</a>
              </li>
              <li class="nav-item">
                <a href="#" class="nav-link">Months</a>
              </li>
            </ul>
          </template>
          <template v-slot:body>
            <MapAmChart element="chartdiv" styles="height: 500px;width: 100%" />
          </template>
        </iq-card>
      </b-col>
      <b-col lg="4" md="12">
        <iq-card class="">
          <template v-slot:headerTitle>
            <h4 class="card-title">Devices</h4>
          </template>
          <template v-slot:headerAction>
            <b-dropdown  id="dropdownMenuButton5" right variant="none" data-toggle="dropdown">
              <template v-slot:button-content>
                <span class="text-primary">View All</span>
              </template>
              <b-dropdown-item href="#"><i class="ri-eye-fill ms-2"></i>View</b-dropdown-item>
              <b-dropdown-item href="#"><i class="ri-delete-bin-6-fill ms-2"></i>Delete</b-dropdown-item>
              <b-dropdown-item href="#"><i class="ri-pencil-fill ms-2"></i>Edit</b-dropdown-item>
              <b-dropdown-item href="#"><i class="ri-printer-fill ms-2"></i>Print</b-dropdown-item>
              <b-dropdown-item href="#"><i class="ri-file-download-fill ms-2"></i>Download</b-dropdown-item>
            </b-dropdown>
          </template>
          <template v-slot:body>
            <ApexChart element="chart-6" :chartOption="chart6"/>
          </template>
        </iq-card>
      </b-col>
    </b-row>
    <b-row class="row-eq-height">
      <b-col lg="8" md="12" class="mb-5 mb-xl-0">
        <iq-card class="">
          <template v-slot:headerTitle>
            <h4 class="card-title">Page visits</h4>
          </template>
          <template v-slot:headerAction>
            <b-dropdown  id="dropdownMenuButton6" right variant="none" data-toggle="dropdown">
              <template v-slot:button-content>
                <span class="dropdown-bg">See all <i class="ri-arrow-down-s-line ms-1 text-primary"></i></span>
              </template>
              <b-dropdown-item href="#"><i class="ri-eye-fill ms-2"></i>View</b-dropdown-item>
              <b-dropdown-item href="#"><i class="ri-delete-bin-6-fill ms-2"></i>Delete</b-dropdown-item>
              <b-dropdown-item href="#"><i class="ri-pencil-fill ms-2"></i>Edit</b-dropdown-item>
              <b-dropdown-item href="#"><i class="ri-printer-fill ms-2"></i>Print</b-dropdown-item>
              <b-dropdown-item href="#"><i class="ri-file-download-fill ms-2"></i>Download</b-dropdown-item>
            </b-dropdown>
          </template>
          <template v-slot:body>
            <b-table :items="items" head-variant="light" class="table align-items-center table-flush">
              <template v-slot:cell(bounce_rate)="data">
                <i :class="data.value.arrow +' text-'+ data.value.color + ' ms-3'"></i> {{ data.value.percentage }}
              </template>
            </b-table>
          </template>
        </iq-card>
      </b-col>
      <b-col lg="4">
        <iq-card class="">
          <template v-slot:headerTitle>
            <h4 class="card-title">Countries</h4>
          </template>
          <template v-slot:headerAction>
            <b-dropdown  id="dropdownMenuButton7" right variant="none" data-toggle="dropdown">
              <template v-slot:button-content>
                <span><i class="ri-more-2-fill"></i></span>
              </template>
              <b-dropdown-item href="#"><i class="ri-eye-fill ms-2"></i>View</b-dropdown-item>
              <b-dropdown-item href="#"><i class="ri-delete-bin-6-fill ms-2"></i>Delete</b-dropdown-item>
              <b-dropdown-item href="#"><i class="ri-pencil-fill ms-2"></i>Edit</b-dropdown-item>
              <b-dropdown-item href="#"><i class="ri-printer-fill ms-2"></i>Print</b-dropdown-item>
              <b-dropdown-item href="#"><i class="ri-file-download-fill ms-2"></i>Download</b-dropdown-item>
            </b-dropdown>
          </template>
          <template v-slot:body>
            <b-row>
              <b-col lg="12">
                <div class="iq-details">
                  <span class="title text-dark">United States</span>
                  <div class="percentage float-right text-primary">95 <span>%</span></div>
                  <div class="iq-progress-bar-linear d-inline-block w-100">
                    <b-progress :value="95" class="iq-progress-bar" variant="primary" ></b-progress>
                  </div>
                </div>
                <div class="iq-details mt-4">
                  <span class="title text-dark">India</span>
                  <div class="percentage float-right text-warning">85 <span>%</span></div>
                  <div class="iq-progress-bar-linear d-inline-block w-100">
                    <b-progress :value="85" class="iq-progress-bar" variant="warning" ></b-progress>
                  </div>
                </div>
                <div class="iq-details mt-4">
                  <span class="title text-dark">Australia</span>
                  <div class="percentage float-right text-success">65 <span>%</span></div>
                  <div class="iq-progress-bar-linear d-inline-block w-100">
                    <b-progress :value="55" class="iq-progress-bar" variant="success" ></b-progress>
                  </div>
                </div>
                <div class="iq-details mt-4">
                  <span class="title text-dark">Brazil</span>
                  <div class="percentage float-right text-danger">45 <span>%</span></div>
                  <div class="iq-progress-bar-linear d-inline-block w-100">
                    <b-progress :value="45" class="iq-progress-bar" variant="danger" ></b-progress>
                  </div>
                </div>
              </b-col>
            </b-row>
          </template>
          <ApexChart element="chart-12" :chartOption="chart12"/>
        </iq-card>
      </b-col>
    </b-row>
  </b-container>
</template>
<script>
import { sofbox } from '../../config/pluginInit'

export default {
  name: 'WebAnalytics',
  components: {
  },
  mounted () {
    sofbox.index()
  },
  data () {
    return {
      chart9: {
        chart: {
          height: 112,
          type: 'area',
          animations: {
            enabled: true,
            easing: 'linear',
            dynamicAnimation: {
              speed: 1000
            }
          },
          toolbar: {
            show: false
          },
          sparkline: {
            enabled: true
          },
          group: 'sparklines'
        },
        dataLabels: {
          enabled: false
        },
        stroke: {
          curve: 'smooth',
          width: 3
        },
        fill: {
          type: 'gradient',
          gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.5,
            opacityTo: 0
          }
        },
        series: [{
          data: []
        }],
        markers: {
          size: 0
        },
        xaxis: {
          type: 'datetime',
          range: 777600000
        },
        yaxis: {
          labels: {
            minWidth: 34
          },
          max: 100
        },
        legend: {
          show: false
        }
      },
      lists: [
        {
          title: 'USERS',
          icons: { icon: 'ri-account-box-line', color: 'warning' },
          number: '850,789',
          arrow: 'ri-arrow-up-fill',
          percentage: '3.48'
        },
        {
          title: 'SESSIONS',
          icons: { icon: 'ri-account-box-line', color: 'danger' },
          number: '810,084',
          arrow: 'ri-arrow-down-fill',
          percentage: '10'
        },
        {
          title: 'BOUNCE RATE',
          icons: { icon: 'ri-timer-2-line', color: 'success' },
          number: '47.6',
          arrow: 'ri-arrow-up-fill',
          percentage: '6.48'
        },
        {
          title: 'DURATION',
          icons: { icon: 'ri-timer-2-line', color: 'primary' },
          number: '3.25',
          arrow: 'ri-arrow-up-fill',
          percentage: '5.48'
        }
      ],
      chart6: {
        chart: {
          height: 400,
          type: 'bar',
          sparkline: {
            show: false
          },
          toolbar: {
            show: false
          }
        },
        colors: ['#0084ff', '#ffd400'],
        plotOptions: {
          bar: {
            horizontal: false,
            columnWidth: '30%',
            endingShape: 'rounded'
          }
        },
        dataLabels: {
          enabled: false
        },
        stroke: {
          show: false,
          width: 5,
          colors: ['#ffffff']
        },
        series: [{
          name: 'Mobile',
          enabled: 'true',
          data: [44, 90, 90, 60, 115]
        }, {
          name: 'Desktop',
          data: [35, 80, 100, 70, 95]
        }],
        fill: {
          opacity: 1
        },
        tooltip: {
          y: {
            formatter: function (val) {
              return '$ ' + val + ' thousands'
            }
          }
        }
      },
      items: [
        { page_name: '/Home', visitors: '4,569', unique_users: 340, bounce_rate: { percentage: '46,53%', arrow: 'ri-arrow-up-fill', color: 'success' } },
        { page_name: '/Dashboard/', visitors: '3,985', unique_users: 319, bounce_rate: { percentage: '46,53%', arrow: 'ri-arrow-down-fill', color: 'warning' } },
        { page_name: '/Dashboard/charts', visitors: '3,513', unique_users: 294, bounce_rate: { percentage: '36,49%', arrow: 'ri-arrow-down-fill', color: 'warning' } },
        { page_name: '/Dashboard/tables', visitors: '2,050', unique_users: 147, bounce_rate: { percentage: '50,87%', arrow: 'ri-arrow-up-fill', color: 'success' } },
        { page_name: '/Dashboard/profile', visitors: '1,795', unique_users: 190, bounce_rate: { percentage: '46,53%', arrow: 'ri-arrow-down-fill', color: 'danger' } },
        { page_name: '/Dashboard/pricing', visitors: '8,395', unique_users: 8190, bounce_rate: { percentage: '46,53%', arrow: 'ri-arrow-down-fill', color: 'danger' } },
        { page_name: '/Dashboard/Signup', visitors: '4,562', unique_users: 4190, bounce_rate: { percentage: '46,53%', arrow: 'ri-arrow-down-fill', color: 'danger' } }
      ],
      chart12: {
        chart: {
          height: 140,
          type: 'area',
          sparkline: {
            enabled: true
          },
          group: 'sparklines'
        },
        dataLabels: {
          enabled: false
        },
        stroke: {
          width: 5,
          curve: 'smooth'
        },
        fill: {
          type: 'gradient',
          gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.5,
            opacityTo: 0
          }
        },
        series: [{
          name: 'series1',
          data: [70, 40, 60, 30, 60]
        } ],
        colors: ['#ffd400'],
        xaxis: {
          type: 'datetime',
          categories: ['2018-08-19T00:00:00', '2018-09-19T01:30:00', '2018-10-19T02:30:00', '2018-11-19T01:30:00', '2018-12-19T01:30:00']
        },
        yaxis: {
          labels: {
            minWidth: 34
          }
        },
        tooltip: {
          x: {
            format: 'dd/MM/yy HH:mm'
          }
        }
      },
      usersList: [
        { name: 'Anna Sthesia', role: 'Admin', image: require('../../assets/images/user/01.jpg'), link: '', isActive: true },
        { name: 'Paul Molive', role: 'User', image: require('../../assets/images/user/02.jpg'), link: '', isActive: false },
        { name: 'Bob Frapples', role: 'Auther', image: require('../../assets/images/user/03.jpg'), link: '', isActive: true },
        { name: 'Barb Ackue', role: 'Editor', image: require('../../assets/images/user/04.jpg'), link: '', isActive: true },
        { name: 'Greta Life', role: 'User', image: require('../../assets/images/user/05.jpg'), link: '', isActive: false },
        { name: 'Ira Membrit', role: 'User', image: require('../../assets/images/user/06.jpg'), link: '', isActive: true },
        { name: 'Pete Sariya', role: 'Editor', image: require('../../assets/images/user/07.jpg'), link: '', isActive: false },
        { name: 'Anna Sthesia', role: 'Editor', image: require('../../assets/images/user/08.jpg'), link: '', isActive: true },
        { name: 'Paul Molive', role: 'Author', image: require('../../assets/images/user/09.jpg'), link: '', isActive: false },
        { name: 'Bob Frapples', role: 'User', image: require('../../assets/images/user/10.jpg'), link: '', isActive: true },
        { name: 'Anna Sthesia', role: 'Admin', image: require('../../assets/images/user/01.jpg'), link: '', isActive: true },
        { name: 'Paul Molive', role: 'User', image: require('../../assets/images/user/02.jpg'), link: '', isActive: false },
        { name: 'Bob Frapples', role: 'Auther', image: require('../../assets/images/user/03.jpg'), link: '', isActive: false },
        { name: 'Barb Ackue', role: 'Editor', image: require('../../assets/images/user/04.jpg'), link: '', isActive: true },
        { name: 'Greta Life', role: 'User', image: require('../../assets/images/user/05.jpg'), link: '', isActive: true }
      ]
    }
  }
}
</script>
