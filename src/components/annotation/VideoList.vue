<template>
  <div
    class="menu-list scrollable"
    :style="{ 'max-height': windowHeight - 40 + 'px' }"
  >
    <div v-for="video in listedVideos" v-bind:key="video">
      <a
        v-on:click="$emit('select', video)"
        :class="video == selected ? 'is-active' : ''"
      >
        <div style="word-wrap: break-word; font-size: small">
          <video width="100%" :src="video | url" type="video/mp4"></video>
          <p>
            <span class="icon is-small">
              <i class="fas fa-film"></i>
            </span>
            {{ video | basename }}
          </p>
          <p v-if="annotations[basename(video)]">
            <span class="icon is-small">
              <i class="fas fa-edit"></i>
            </span>
            {{ annotations[basename(video)] }}
          </p>
        </div>
      </a>
    </div>
  </div>
</template>


<script>
import path from "path";
import { mapGetters } from "vuex";

export default {
  name: "VideoList",
  props: {
    selected: String,
    showAnnotated: Boolean,
  },
  methods: {
    scrollIntoView() {
      setTimeout(() => {
        let elements = document.getElementsByClassName("is-active");
        if (elements.length > 0) {
          elements[0].scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }, 100);
    },
    basename: (s) => path.basename(s),
  },
  computed: {
    ...mapGetters({
      videos: "activeVideos",
      annotations: "activeAnnotations",
      unannotatedVideos: "activeUnannotatedVideos",
    }),
    ...mapGetters(["windowHeight"]),
    listedVideos() {
      if (this.showAnnotated) {
        return this.videos;
      } else {
        return this.unannotatedVideos;
      }
    },
  },
  watch: {
    selected() {
      this.scrollIntoView();
    },
    showAnnotated() {
      this.scrollIntoView();
    },
  },
  filters: {
    basename: (s) => path.basename(s),
    url: (s) => "local-resource://" + s,
  },
};
</script>


<style>
::-webkit-scrollbar {
  -webkit-appearance: none;
  width: 7px;
}

::-webkit-scrollbar-thumb {
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.5);
  box-shadow: 0 0 1px rgba(255, 255, 255, 0.5);
}

.scrollable {
  overflow-y: scroll;
}
</style>