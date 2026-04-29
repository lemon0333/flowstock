# 호스트(CI runner)에서 ./gradlew :app:bootJar로 미리 빌드한 jar를 그대로 복사한다.
# Docker 빌드 안에서 gradle을 다시 돌리면 plugins.gradle.org가 503일 때 그대로 죽고,
# 호스트의 ~/.gradle 캐시도 활용 못 해서 매번 plugin/dep을 새로 받아야 한다.
# CI: deploy.yml의 "Build with Gradle" 단계에서 jar가 만들어진 뒤 docker build가 호출됨.
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

COPY app/build/libs/app-*-SNAPSHOT.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
