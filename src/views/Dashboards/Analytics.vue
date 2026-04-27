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
          <b-row>
            <b-col md="6">
              <iq-card>
                <template v-slot:body>
                  <b-row>
                    <b-col lg="12" class="mb-2 d-flex justify-content-between">
                      <div class="icon iq-icon-box rounded-circle iq-bg-primary rounded-circle" data-wow-delay="0.2s">
                        <i class="ri-account-box-line"></i>
                      </div>
                    </b-col>
                    <b-col lg="12" class="mt-3">
                      <h6 class="card-title text-uppercase text-secondary mb-0">Users</h6>
                      <span class="h2 text-dark mb-0 counter d-inline-block w-100">91,586</span>
                    </b-col>
                  </b-row>
                  <p class="mb-0 text-muted mt-3">
                    <span class="text-success ms-2"><i class="ri-arrow-up-fill"></i> 3.48%</span>
                  </p>
                </template>
              </iq-card>
            </b-col>
            <b-col md="6">
              <iq-card>
                <template v-slot:body>
                  <b-row>
                    <b-col lg="12" class="mb-2 d-flex justify-content-between">
                      <div class="icon iq-icon-box rounded-circle iq-bg-danger rounded-circle" data-wow-delay="0.2s">
                        <i class="ri-window-line"></i>
                      </div>
                    </b-col>
                    <b-col lg="12" class="mt-3">
                      <h6 class="card-title text-uppercase text-secondary mb-0">Session</h6>
                      <span class="h2 text-dark mb-0 counter d-inline-block w-100">750,897</span>
                    </b-col>
                  </b-row>
                  <p class="mb-0 text-muted mt-3">
                    <span class="text-danger ms-2"><i class="ri-arrow-down-fill"></i> 10%</span>
                  </p>
                </template>
              </iq-card>
            </b-col>
          </b-row>
          <b-row>
            <b-col md="6">
              <iq-card>
                <template v-slot:body>
                  <b-row>
                    <b-col lg="12" class="mb-2 d-flex justify-content-between">
                      <div class="icon iq-icon-box rounded-circle iq-bg-success rounded-circle" data-wow-delay="0.2s">
                        <i class="ri-clockwise-2-line"></i>
                      </div>
                    </b-col>
                    <b-col lg="12" class="mt-3">
                      <h6 class="card-title text-uppercase text-secondary mb-0">Bounce Rate</h6>
                        <span class="h2 text-dark mb-0 counter d-inline-block w-100">45.8</span>
                      </b-col>
                  </b-row>
                  <p class="mb-0 text-muted mt-3">
                    <span class="text-success ms-2"><i class="ri-arrow-up-fill"></i> 5.17%</span>
                  </p>
                </template>
              </iq-card>
            </b-col>
            <b-col md="6">
              <iq-card>
                <template v-slot:body>
                  <b-row>
                    <b-col lg="12" class="mb-2 d-flex justify-content-between">
                      <div class="icon iq-icon-box rounded-circle iq-bg-info rounded-circle" data-wow-delay="0.2s">
                        <i class="ri-timer-2-line"></i>
                      </div>
                    </b-col>
                    <b-col lg="12" class="mt-3">
                      <h6 class="card-title text-uppercase text-secondary mb-0">Duration</h6>
                      <span class="h2 text-dark mb-0 counter d-inline-block w-100">3.21</span>
                    </b-col>
                  </b-row>
                  <p class="mb-0 text-muted mt-3">
                    <span class="text-success ms-2"><i class="ri-arrow-up-fill"></i> 8.48%</span>
                  </p>
                </template>
              </iq-card>
            </b-col>
          </b-row>
        </b-col>
        <b-col lg="8" md="12">
          <iq-card body-class="p-0">
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
              <div class="d-flex justify-content-around mt-4">
                <div class="price-week-box ms-5">
                  <span>Active Users</span>
                  <h2><span class="counter">380</span> <i class="ri-funds-line text-success font-size-18"></i></h2>
                </div>
                <div class="price-week-box">
                  <span>User retention</span>
                  <h2><span class="counter">52.55</span><i class="ri-funds-line text-success font-size-18"></i></h2>
                </div>
              </div>
              <ApexChart element="chart-19" :chartOption="chart19"/>
            </template>
          </iq-card>
        </b-col>
      </b-row>
      <b-row class="row-eq-height">
        <b-col lg="3" md="6">
          <iq-card class="" body-class="p-0">
            <template v-slot:headerTitle>
              <h4 class="card-title">Devices</h4>
            </template>
            <template v-slot:headerAction>
              <b-dropdown  id="dropdownMenuButton2" right variant="none" data-toggle="dropdown">
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
              <ApexChart element="chart-13" :chartOption="chart13"/>
            </template>
          </iq-card>
        </b-col>
        <b-col lg="3" md="6">
          <iq-card class="">
            <template v-slot:headerTitle>
              <h4 class="card-title">Users</h4>
            </template>
            <template v-slot:headerAction>
              <b-dropdown  id="dropdownMenuButton3" right variant="none" data-toggle="dropdown">
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
              <ApexChart element="chart-15" :chartOption="chart15"/>
            </template>
          </iq-card>
        </b-col>
        <b-col lg="6" md="12" class="mb-5 mb-xl-0">
          <iq-card class="">
            <template v-slot:headerTitle>
              <h4 class="card-title">Page Metrics</h4>
            </template>
            <template v-slot:headerAction>
              <b-dropdown  id="dropdownMenuButton4" right variant="none" data-toggle="dropdown">
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
              <p>Lorem Ipsum is simply dummy text of the printing and typesetting industry.</p>
              <b-row>
                <b-col md="6">
                  <ApexChart element="chart-14" :chartOption="chart14"/>
                </b-col>
                <b-col md="6" class="align-self-center">
                  <b-row>
                    <b-col md="12">
                      <h5 class="text-dark mb-0">Our goal</h5>
                      <h2 class="text-primary">85%<small class="ms-3">Traffic</small></h2>
                    </b-col>
                  </b-row>
                  <hr>
                  <b-row>
                    <b-col md="12">
                      <h6 class="d-inline-block w-100 mb-2">Previous scores</h6>
                      <h5>August<span class="ms-3 font-size-22 text-success">69%</span></h5>
                      <h5>September<span class="ms-3 font-size-22 text-danger">40%</span></h5>
                    </b-col>
                  </b-row>
                </b-col>
              </b-row>
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
              <b-dropdown  id="dropdownMenuButton5" right variant="none" data-toggle="dropdown">
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
              <b-dropdown  id="dropdownMenuButton6" right variant="none" data-toggle="dropdown">
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
                    <div class="percentage float-right text-warning">75 <span>%</span></div>
                    <div class="iq-progress-bar-linear d-inline-block w-100">
                      <b-progress :value="75" class="iq-progress-bar" variant="warning" ></b-progress>
                    </div>
                  </div>
                  <div class="iq-details mt-4">
                    <span class="title text-dark">Australia</span>
                    <div class="percentage float-right text-success">55 <span>%</span></div>
                    <div class="iq-progress-bar-linear d-inline-block w-100">
                      <b-progress :value="55" class="iq-progress-bar" variant="success" ></b-progress>
                    </div>
                  </div>
                  <div class="iq-details mt-4">
                    <span class="title text-dark">Brazil</span>
                    <div class="percentage float-right text-danger">25 <span>%</span></div>
                    <div class="iq-progress-bar-linear d-inline-block w-100">
                      <b-progress :value="25" class="iq-progress-bar" variant="danger" ></b-progress>
                    </div>
                  </div>
                </b-col>
              </b-row>
            </template>
            <ApexChart element="bar-chart-12" :chartOption="barChart12" :isLive="true"/>
          </iq-card>
        </b-col>
      </b-row>
  </b-container>
</template>
<script>
import { sofbox } from '../../config/pluginInit'
export default {
  name: 'Analytics',
  components: {
  },
  mounted () {
    sofbox.index()
  },
  data () {
    return {
      chart19: {
        chart: {
          height: 308,
          type: 'line',
          toolbar: {
            show: false
          }
        },
        series: [{
          name: 'Website Blog',
          type: 'column',
          data: [440, 505, 414, 671, 227, 413, 201, 352, 752, 320, 257, 160]
        }, {
          name: 'Social Media',
          type: 'line',
          data: [23, 42, 35, 27, 43, 22, 17, 31, 22, 22, 12, 16]
        }],
        stroke: {
          width: [0, 4]
        },
        title: {
          show: false
        },
        legend: {
          show: false
        },
        labels: ['01 Jan 2001', '02 Jan 2001', '03 Jan 2001', '04 Jan 2001', '05 Jan 2001', '06 Jan 2001', '07 Jan 2001', '08 Jan 2001', '09 Jan 2001', '10 Jan 2001', '11 Jan 2001', '12 Jan 2001'],
        colors: ['#0084ff', '#00ca00'],
        xaxis: {
          labels: {
            show: false
          },
          type: 'datetime'
        },
        yaxis: [{
          labels: {
            show: false
          }
        }, {
          labels: {
            show: false
          }
        }]
      },
      chart13: {
        chart: {
          height: 420,
          type: 'radialBar',
          stroke: {
            show: true,
            curve: 'smooth',
            lineCap: 'butt',
            colors: undefined,
            width: 3,
            dashArray: 0
          }
        },
        plotOptions: {
          radialBar: {
            hollow: {
              margin: 10,
              size: '30%',
              background: 'transparent',
              image: undefined,
              imageWidth: 64,
              imageHeight: 64
            },
            dataLabels: {
              name: {
                fontSize: '22px'
              },
              value: {
                fontSize: '16px'
              },
              total: {
                show: true,
                label: 'Total',
                formatter: function (w) {
                  // By default this function returns the average of all series. The below is just an example to show the use of custom formatter function
                  return 249
                }
              }
            }
          }
        },
        fill: {
          type: 'gradient'
        },
        colors: ['#0084ff', '#00ca00', '#ffd400'],
        series: [44, 55, 67],
        stroke: {
          lineCap: 'round'
        },
        labels: [' Mobile', 'Desktop', 'Tablet', 'Watch']
      },
      chart15: {
        chart: {
          height: 310,
          type: 'line',
          stacked: false,
          toolbar: {
            show: false
          }
        },
        dataLabels: {
          enabled: false
        },
        colors: ['#00ca00', '#0084ff', '#e64141'],
        series: [{
          name: 'Income',
          type: 'column',
          data: [14, 2, 25, 15, 25, 28, 38, 46]
        }, {
          name: 'Cashflow',
          type: 'column',
          data: [11, 3, 31, 4, 41, 49, 65, 85]
        }, {
          name: 'Revenue',
          type: 'line',
          data: [20, 29, 37, 36, 44, 45, 50, 58]
        }],
        stroke: {
          width: [1, 1, 4]
        },
        xaxis: {
          categories: [2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016],
          labels: {
            show: false
          }
        },
        yaxis: {
          show: false
        },
        tooltip: {
          theme: 'dark',
          fixed: {
            enabled: true,
            position: 'topLeft', // topRight, topLeft, bottomRight, bottomLeft
            offsetY: 30,
            offsetX: 60
          }
        },
        legend: {
          show: false
        }
      },
      chart14: {
        chart: {
          height: 350,
          type: 'radialBar'
        },
        plotOptions: {
          hollow: {
            margin: 10,
            size: '30%',
            background: 'transparent',
            image: undefined,
            imageWidth: 64,
            imageHeight: 64
          },
          radialBar: {
            startAngle: -135,
            endAngle: 135,
            dataLabels: {
              name: {
                fontSize: '16px',
                color: undefined,
                offsetY: 120
              },
              value: {
                offsetY: 76,
                fontSize: '22px',
                color: undefined,
                formatter: function (val) {
                  return val + '%'
                }
              }
            }
          }
        },
        fill: {},
        stroke: {
          dashArray: 5
        },
        series: [67],
        labels: ['User traffic'],
        colors: ['#0084ff']
      },
      barChart12: {
        chart: {
          height: 150,
          type: 'bar',
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
          width: 15
        },
        series: [{
          name: 'series1',
          data: [ 70, 40, 60, 30, 60 ]
        } ],
        colors: ['#e5f2ff'],
        xaxis: {
          type: 'datetime',
          categories: ['2019-08-19T00:00:00', '2019-09-19T00:00:00', '2019-10-19T00:00:00', '2019-11-19T00:00:00']
        },
        tooltip: {
          x: {
            format: 'dd/MM/yy HH:mm'
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
