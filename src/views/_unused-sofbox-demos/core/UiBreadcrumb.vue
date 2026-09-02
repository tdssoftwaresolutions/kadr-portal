<template>
  <b-container fluid>
    <b-row>
      <b-col lg="6" sm="12">
        <iq-card>
          <template v-slot:headerTitle>
            <h4 class="card-title">Breadcrumb</h4>
          </template>
          <template v-slot:headerAction>
            <a class="text-primary float-right" v-b-toggle.collapse-1 role="button">
              <i class="ri-code-s-slash-line" />
            </a>
          </template>
          <template v-slot:body>
            <p>Use the items in order to programatically generate the breadcrumb links.use class <code>.breadcrumb to ol</code></p>
            <b-collapse id="collapse-1" class="mb-2">
              <div class="card">
                <kbd class="bg-dark">
                  <pre class="text-white" id="breadcrumb-1">
                    <code>
&lt;b-breadcrumb :items="items1" /&gt;
&lt;b-breadcrumb :items="items2" /&gt;
&lt;b-breadcrumb :items="items3" /&gt;

&lt;script&gt;
export default {
  data() {
    return {
      items1: [
        {
          text: 'Home',
          active: true
        }
      ],
      items2: [
        {
          text: 'Home',
          href: '#'
        },
        {
          text: 'Library',
          active: true
        }
      ],
      items3: [
        {
          text: 'Home',
          href: '#'
        },
        {
          text: 'Library',
          href: '#'
        },
        {
          text: 'Data',
          active: true
        }
      ]
    }
  }
}
</code></pre>
                </kbd>
              </div>
            </b-collapse>
             <b-breadcrumb :items="items1" />
             <b-breadcrumb :items="items2" />
             <b-breadcrumb :items="items3" />
          </template>
        </iq-card>
      </b-col>
      <b-col lg="6" sm="12">
        <iq-card>
          <template v-slot:headerTitle>
            <h4 class="card-title">Breadcrumb With Icon</h4>
          </template>
          <template v-slot:headerAction>
            <a class="text-primary float-right" v-b-toggle.collapse-2 role="button">
              <i class="ri-code-s-slash-line" />
            </a>
          </template>
          <template v-slot:body>
            <p>Use the items in order to programatically generate the breadcrumb links.use class <code>.breadcrumb to ol</code> with Icon</p>
            <b-collapse id="collapse-2" class="mb-2">
              <div class="card">
                <kbd class="bg-dark">
                  <pre class="text-white" id="breadcrumb-icon-1">
                    <code>
&lt;b-breadcrumb :items="itemsIcon1" /&gt;
&lt;b-breadcrumb :items="itemsIcon2" /&gt;
&lt;b-breadcrumb :items="itemsIcon3" /&gt;

&lt;script&gt;
export default {
  data() {
    return {
      itemsIcon1: [
        {
          html: '&lt;i class="ri-home-4-line ms-1 float-left"&gt;&lt;/i&gt;Home',
          active: true
        }
      ],
      itemsIcon2: [
        {
          html: '&lt;i class="ri-home-4-line ms-1 float-left"&gt;&lt;/i&gt;Home',
          href: '#'
        },
        {
          text: 'Library',
          active: true
        }
      ],
      itemsIcon3: [
        {
          html: '&lt;i class="ri-home-4-line ms-1 float-left"&gt;&lt;/i&gt;Home',
          href: '#'
        },
        {
          text: 'Library',
          href: '#'
        },
        {
          text: 'Data',
          active: true
        }
      ]
    }
  }
}
</code></pre>
                </kbd>
              </div>
            </b-collapse>
             <b-breadcrumb :items="itemsIcon1" />
             <b-breadcrumb :items="itemsIcon2" />
             <b-breadcrumb :items="itemsIcon3" />
          </template>
        </iq-card>
      </b-col>
    </b-row>
    <b-row>
      <b-col lg="6" sm="12">
        <iq-card>
          <template v-slot:headerTitle>
            <h4 class="card-title">Breadcrumb</h4>
          </template>
          <template v-slot:headerAction>
            <a class="text-primary float-right" v-b-toggle.collapse-3 role="button">
              <i class="ri-code-s-slash-line" />
            </a>
          </template>
          <template v-slot:body>
            <p>use class <code>.breadcrumb .bg-primary</code></p>
            <b-collapse id="collapse-3" class="mb-2">
              <div class="card">
                <kbd class="bg-dark">
                  <pre class="text-white" id="breadcrumb-2">
                    <code>
&lt;b-breadcrumb class="bg-primary" :items="items1" /&gt;
&lt;b-breadcrumb class="bg-primary" :items="items2" /&gt;
&lt;b-breadcrumb class="bg-primary" :items="items3" /&gt;

&lt;script&gt;
export default {
  data() {
    return {
      items1: [
        {
          text: 'Home',
          active: true
        }
      ],
      items2: [
        {
          text: 'Home',
          href: '#'
        },
        {
          text: 'Library',
          active: true
        }
      ],
      items3: [
        {
          text: 'Home',
          href: '#'
        },
        {
          text: 'Library',
          href: '#'
        },
        {
          text: 'Data',
          active: true
        }
      ]
    }
  }
}
</code></pre>
                </kbd>
              </div>
            </b-collapse>
             <b-breadcrumb class="bg-primary" :items="items1" />
             <b-breadcrumb class="bg-primary" :items="items2" />
             <b-breadcrumb class="bg-primary" :items="items3" />
          </template>
        </iq-card>
      </b-col>
      <b-col lg="6" sm="12">
        <iq-card>
          <template v-slot:headerTitle>
            <h4 class="card-title">Breadcrumb With Icon</h4>
          </template>
          <template v-slot:headerAction>
            <a class="text-primary float-right" v-b-toggle.collapse-4 role="button">
              <i class="ri-code-s-slash-line" />
            </a>
          </template>
          <template v-slot:body>
            <p>use class <code>.breadcrumb .bg-primary </code> With Icon.</p>
            <b-collapse id="collapse-4" class="mb-2">
              <div class="card">
                <kbd class="bg-dark">
                  <pre class="text-white" id="breadcrumb-icon-2">
                    <code>
&lt;b-breadcrumb class="bg-primary" :items="itemsIcon1" /&gt;
&lt;b-breadcrumb class="bg-primary" :items="itemsIcon2" /&gt;
&lt;b-breadcrumb class="bg-primary" :items="itemsIcon3" /&gt;

&lt;script&gt;
export default {
  data() {
    return {
      itemsIcon1: [
        {
          html: '&lt;i class="ri-home-4-line ms-1 float-left"&gt;&lt;/i&gt;Home',
          active: true
        }
      ],
      itemsIcon2: [
        {
          html: '&lt;i class="ri-home-4-line ms-1 float-left"&gt;&lt;/i&gt;Home',
          href: '#'
        },
        {
          text: 'Library',
          active: true
        }
      ],
      itemsIcon3: [
        {
          html: '&lt;i class="ri-home-4-line ms-1 float-left"&gt;&lt;/i&gt;Home',
          href: '#'
        },
        {
          text: 'Library',
          href: '#'
        },
        {
          text: 'Data',
          active: true
        }
      ]
    }
  }
}
</code></pre>
                </kbd>
              </div>
            </b-collapse>
             <b-breadcrumb class="bg-primary" :items="itemsIcon1" />
             <b-breadcrumb class="bg-primary" :items="itemsIcon2" />
             <b-breadcrumb class="bg-primary" :items="itemsIcon3" />
          </template>
        </iq-card>
      </b-col>
    </b-row>
    <b-row>
      <b-col lg="6" sm="12">
        <iq-card>
          <template v-slot:headerTitle>
            <h4 class="card-title">Breadcrumb With Icon</h4>
          </template>
          <template v-slot:headerAction>
            <a class="text-primary float-right" v-b-toggle.collapse-5 role="button">
              <i class="ri-code-s-slash-line" />
            </a>
          </template>
          <template v-slot:body>
            <p>use class <code>.breadcrumb .iq-bg-primary</code></p>
            <b-collapse id="collapse-5" class="mb-2">
              <div class="card">
                <kbd class="bg-dark">
                  <pre class="text-white" id="breadcrumb-icon-3">
                    <code>
&lt;b-breadcrumb class="iq-bg-primary" :items="itemsIcon1" /&gt;
&lt;b-breadcrumb class="iq-bg-primary" :items="itemsIcon2" /&gt;
&lt;b-breadcrumb class="iq-bg-primary" :items="itemsIcon3" /&gt;

&lt;script&gt;
export default {
  data() {
    return {
      itemsIcon1: [
        {
          html: '&lt;i class="ri-home-4-line ms-1 float-left"&gt;&lt;/i&gt;Home',
          active: true
        }
      ],
      itemsIcon2: [
        {
          html: '&lt;i class="ri-home-4-line ms-1 float-left"&gt;&lt;/i&gt;Home',
          href: '#'
        },
        {
          text: 'Library',
          active: true
        }
      ],
      itemsIcon3: [
        {
          html: '&lt;i class="ri-home-4-line ms-1 float-left"&gt;&lt;/i&gt;Home',
          href: '#'
        },
        {
          text: 'Library',
          href: '#'
        },
        {
          text: 'Data',
          active: true
        }
      ]
    }
  }
}
</code></pre>
                </kbd>
              </div>
            </b-collapse>
             <b-breadcrumb class="iq-bg-primary" :items="itemsIcon1" />
             <b-breadcrumb class="iq-bg-primary" :items="itemsIcon2" />
             <b-breadcrumb class="iq-bg-primary" :items="itemsIcon3" />
          </template>
        </iq-card>
      </b-col>
      <b-col lg="6" sm="12">
        <iq-card>
          <template v-slot:headerTitle>
            <h4 class="card-title">Breadcrumb With Icon</h4>
          </template>
          <template v-slot:headerAction>
            <a class="text-primary float-right" v-b-toggle.collapse-6 role="button">
              <i class="ri-code-s-slash-line" />
            </a>
          </template>
          <template v-slot:body>
            <p>use class <code>.breadcrumb .iq-bg-danger</code></p>
            <b-collapse id="collapse-6" class="mb-2">
              <div class="card">
                <kbd class="bg-dark">
                  <pre class="text-white" id="breadcrumb-icon-4">
                    <code>
&lt;b-breadcrumb class="iq-bg-danger" :items="itemsIcon1" /&gt;
&lt;b-breadcrumb class="iq-bg-danger" :items="itemsIcon2" /&gt;
&lt;b-breadcrumb class="iq-bg-danger" :items="itemsIcon3" /&gt;

&lt;script&gt;
export default {
  data() {
    return {
      itemsIcon1: [
        {
          html: '&lt;i class="ri-home-4-line ms-1 float-left"&gt;&lt;/i&gt;Home',
          active: true
        }
      ],
      itemsIcon2: [
        {
          html: '&lt;i class="ri-home-4-line ms-1 float-left"&gt;&lt;/i&gt;Home',
          href: '#'
        },
        {
          text: 'Library',
          active: true
        }
      ],
      itemsIcon3: [
        {
          html: '&lt;i class="ri-home-4-line ms-1 float-left"&gt;&lt;/i&gt;Home',
          href: '#'
        },
        {
          text: 'Library',
          href: '#'
        },
        {
          text: 'Data',
          active: true
        }
      ]
    }
  }
}
</code></pre>
                </kbd>
              </div>
            </b-collapse>
             <b-breadcrumb class="iq-bg-danger" :items="itemsIcon1" />
             <b-breadcrumb class="iq-bg-danger" :items="itemsIcon2" />
             <b-breadcrumb class="iq-bg-danger" :items="itemsIcon3" />
          </template>
        </iq-card>
      </b-col>
    </b-row>
  </b-container>
</template>
<script>
import { sofbox } from '../../config/pluginInit'

export default {
  name: 'UiBreadcrumb',
  mounted () {
    sofbox.index()
  },
  data () {
    return {
      items1: [
        {
          text: 'Home',
          active: true
        }
      ],
      items2: [
        {
          text: 'Home',
          href: '#'
        },
        {
          text: 'Library',
          active: true
        }
      ],
      items3: [
        {
          text: 'Home',
          href: '#'
        },
        {
          text: 'Library',
          href: '#'
        },
        {
          text: 'Data',
          active: true
        }
      ],
      itemsIcon1: [
        {
          html: '<i class="ri-home-4-line ms-1 float-left"></i>Home',
          active: true
        }
      ],
      itemsIcon2: [
        {
          html: '<i class="ri-home-4-line ms-1 float-left"></i>Home',
          href: '#'
        },
        {
          text: 'Library',
          active: true
        }
      ],
      itemsIcon3: [
        {
          html: '<i class="ri-home-4-line ms-1 float-left"></i>Home',
          href: '#'
        },
        {
          text: 'Library',
          href: '#'
        },
        {
          text: 'Data',
          active: true
        }
      ]
    }
  }
}
</script>
